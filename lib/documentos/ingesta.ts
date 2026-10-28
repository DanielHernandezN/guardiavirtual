import { createHash } from "node:crypto";
import type { ResultadoIngesta, TipoArchivo } from "./tipos";

/**
 * Ingesta documental — Guardia Virtual
 * ────────────────────────────────────
 * Convierte un archivo en texto utilizable por el motor de extracción.
 *
 * Reglas:
 * - Solo se aceptan TXT/MD, DOCX y PDF (por extensión y firma del archivo).
 * - Si la extracción queda vacía o demasiado corta se informa que el documento
 *   parece escaneado y se rechaza: **no se declara procesado**.
 * - El texto original se conserva; la normalización es solo para trabajar.
 */

/** Tamaño máximo aceptado para un documento de origen. */
export const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

/** Umbral bajo el cual se considera que no hubo texto extraíble. */
const CARACTERES_MINIMOS = 40;

/**
 * Máximo de caracteres que se procesan en una solicitud.
 * Un acta real ronda las 5.000–15.000 letras; el tope evita que un archivo
 * enorme dispare decenas de llamadas al modelo y minutos de espera.
 */
export const CARACTERES_MAXIMOS = 40_000;

/** Extensiones admitidas. */
const TIPOS_POR_EXTENSION: Record<string, TipoArchivo> = {
  txt: "txt",
  md: "txt",
  docx: "docx",
  pdf: "pdf",
};

/** Devuelve el tipo admitido según el nombre del archivo. */
export const tipoPorNombre = (nombre: string): TipoArchivo | null => {
  const extension = nombre.toLowerCase().split(".").pop() ?? "";
  return TIPOS_POR_EXTENSION[extension] ?? null;
};

/** Huella SHA-256 del archivo (para trazabilidad). */
export const huellaArchivo = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const empiezaCon = (bytes: Uint8Array, firma: number[]): boolean =>
  firma.every((valor, indice) => bytes[indice] === valor);

/** Verifica que la firma del archivo coincida con el tipo declarado. */
const firmaValida = (tipo: TipoArchivo, bytes: Uint8Array): boolean => {
  if (tipo === "pdf") {
    return empiezaCon(bytes, [0x25, 0x50, 0x44, 0x46]); // %PDF
  }

  if (tipo === "docx") {
    return empiezaCon(bytes, [0x50, 0x4b, 0x03, 0x04]); // ZIP
  }

  // Texto: se rechaza contenido binario (bytes nulos).
  return !bytes.includes(0);
};

/** Normaliza espacios y saltos de línea sin alterar el contenido. */
const normalizarTexto = (texto: string): string =>
  texto
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

/** Extrae el texto de un DOCX (incluye tablas y encabezados de texto). */
const extraerDocx = async (bytes: Uint8Array): Promise<string> => {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });
  return value;
};

/** Extrae el texto de un PDF con capa de texto. */
const extraerPdf = async (
  bytes: Uint8Array
): Promise<{ texto: string; paginas: number | null }> => {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  const unido = Array.isArray(text) ? text.join("\n") : text;
  return { texto: unido, paginas: totalPages ?? null };
};

/**
 * Extrae el texto del documento recibido.
 *
 * Nunca lanza por un documento inválido: devuelve `ok: false` con el motivo
 * para que la interfaz explique qué hacer (por ejemplo, aplicar OCR).
 */
export const extraerTextoDocumento = async ({
  nombre,
  bytes,
}: {
  nombre: string;
  bytes: Uint8Array;
}): Promise<ResultadoIngesta> => {
  const tipo = tipoPorNombre(nombre);

  if (!tipo) {
    return {
      ok: false,
      motivo: "tipo",
      error:
        "Formato no admitido. Adjunta un archivo .txt, .docx o .pdf con texto digital.",
      advertencias: [],
    };
  }

  if (bytes.byteLength === 0) {
    return {
      ok: false,
      motivo: "vacio",
      error: "El archivo está vacío.",
      advertencias: [],
    };
  }

  if (bytes.byteLength > TAMANO_MAXIMO_BYTES) {
    return {
      ok: false,
      motivo: "lectura",
      error: `El archivo supera el máximo de ${
        TAMANO_MAXIMO_BYTES / 1024 / 1024
      } MB.`,
      advertencias: [],
    };
  }

  if (!firmaValida(tipo, bytes)) {
    return {
      ok: false,
      motivo: "tipo",
      error:
        "El contenido del archivo no corresponde al formato indicado por su extensión.",
      advertencias: [],
    };
  }

  const advertencias: string[] = [];
  let crudo = "";
  let paginas: number | null = null;
  let metodo: "texto" | "docx" | "pdf" = "texto";

  try {
    if (tipo === "docx") {
      metodo = "docx";
      crudo = await extraerDocx(bytes);
    } else if (tipo === "pdf") {
      metodo = "pdf";
      const resultado = await extraerPdf(bytes);
      crudo = resultado.texto;
      paginas = resultado.paginas;
    } else {
      const decodificado = new TextDecoder("utf-8").decode(bytes);
      const reemplazos = (decodificado.match(/\uFFFD/g) ?? []).length;

      if (decodificado.length > 0 && reemplazos / decodificado.length > 0.02) {
        return {
          ok: false,
          motivo: "lectura",
          error:
            "El archivo de texto no está en UTF-8 y no se pudo leer correctamente. Guárdalo con codificación UTF-8 y vuelve a intentarlo.",
          advertencias: [],
        };
      }

      crudo = decodificado.replace(/^\uFEFF/, "");
    }
  } catch {
    return {
      ok: false,
      motivo: "lectura",
      error:
        "No se pudo abrir el archivo. Verifica que no esté dañado ni protegido con contraseña.",
      advertencias: [],
    };
  }

  const texto = normalizarTexto(crudo);

  if (texto.length > CARACTERES_MAXIMOS) {
    return {
      ok: false,
      motivo: "lectura",
      error: `El documento tiene ${texto.length.toLocaleString(
        "es-CL"
      )} caracteres y el máximo por solicitud es ${CARACTERES_MAXIMOS.toLocaleString(
        "es-CL"
      )}. Divide el acta o procesa solo el procedimiento correspondiente.`,
      advertencias: [],
    };
  }

  if (texto.length < CARACTERES_MINIMOS) {
    return {
      ok: false,
      motivo: "ocr",
      error:
        "El documento no contiene texto digital suficiente (parece escaneado o compuesto por imágenes). Se necesita OCR para procesarlo; por ahora no se puede extraer automáticamente.",
      advertencias: [
        "No se declara procesado: no se extrajo texto verificable del archivo.",
      ],
    };
  }

  if (tipo === "pdf" && paginas && texto.length / paginas < 200) {
    advertencias.push(
      "El PDF tiene poco texto por página: puede incluir páginas escaneadas sin OCR."
    );
  }

  return {
    ok: true,
    nombre,
    tipo,
    texto,
    caracteres: texto.length,
    metodo,
    paginas,
    advertencias,
    requiereOcr: false,
  };
};
