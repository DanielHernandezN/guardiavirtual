import {
  AlignmentType,
  Document,
  Footer,
  LineRuleType,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
  convertMillimetersToTwip,
} from "docx";
import { TITULO_ENCABEZADO, TITULO_PIE, TITULO_RELATO } from "../plantillas";
import type { SeccionBorrador } from "../types";
import type { FormatoDocumento } from "./tipos";

/**
 * Generación de Word — Guardia Virtual
 * ────────────────────────────────────
 * Convierte el borrador revisado en un .docx con el formato institucional
 * definido en la plantilla: Arial 11, interlineado 1,5, márgenes, membrete
 * centrado, secciones en negrita y bloque de firmas.
 *
 * El documento se arma desde las secciones ya aprobadas por el funcionario:
 * no se vuelve a llamar a la IA ni se agrega contenido nuevo.
 */

/** Formato por defecto (coincide con las plantillas de `documentos/plantillas.ts`). */
export const FORMATO_POR_DEFECTO: FormatoDocumento = {
  fuente: "Arial",
  tamanoPuntos: 11,
  interlineado: 1.5,
  margenesCm: { superior: 2.5, inferior: 2.5, izquierdo: 3, derecho: 2 },
  justificado: true,
};

const MARCADOR_PENDIENTE = /(\[PENDIENTE\])/g;

/** Convierte el texto en runs, destacando los datos pendientes. */
const runsDeTexto = (
  texto: string,
  opciones: { negrita?: boolean; tamano?: number } = {}
): TextRun[] =>
  texto
    .split(MARCADOR_PENDIENTE)
    .filter((parte) => parte.length > 0)
    .map(
      (parte) =>
        new TextRun({
          text: parte,
          bold: opciones.negrita || parte === "[PENDIENTE]",
          size: opciones.tamano,
        })
    );

/** Párrafos justificados de un bloque de texto. */
const parrafosDeContenido = (
  contenido: string,
  formato: FormatoDocumento
): Paragraph[] =>
  contenido
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map(
      (linea) =>
        new Paragraph({
          alignment: formato.justificado
            ? AlignmentType.JUSTIFIED
            : AlignmentType.LEFT,
          spacing: { after: 120 },
          children: runsDeTexto(linea),
        })
    );

/** Párrafos centrados del membrete (cada línea en negrita). */
const parrafosDeMembrete = (contenido: string): Paragraph[] =>
  contenido
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map(
      (linea, indice) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: indice === 0 ? 60 : 40 },
          children: [
            new TextRun({
              text: linea,
              bold: true,
              size: indice === 0 ? 26 : 22,
            }),
          ],
        })
    );

/** Bloque de firmas: nombre centrado y línea para firmar. */
const parrafosDeFirma = (contenido: string): Paragraph[] => {
  const parrafos: Paragraph[] = [];

  for (const linea of contenido.split(/\n+/)) {
    const limpia = linea.trim();
    if (!limpia) continue;

    const [nombre, lineaFirma] = limpia.split(/_{5,}/);

    if (lineaFirma !== undefined) {
      parrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 360, after: 0 },
          children: runsDeTexto(nombre.trim(), { negrita: true }),
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun("_________________________")],
        })
      );
    } else {
      parrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: runsDeTexto(limpia, {
            negrita: /FUNCIONARIOS A CARGO/i.test(limpia),
          }),
        })
      );
    }
  }

  return parrafos;
};

/** Cuerpo del documento, respetando el orden de las secciones recibidas. */
const childrenDelDocumento = (
  secciones: readonly SeccionBorrador[],
  formato: FormatoDocumento
): Paragraph[] => {
  const parrafos: Paragraph[] = [];

  for (const seccion of secciones) {
    const contenido = seccion.contenido?.trim();
    if (!contenido) continue;

    if (seccion.titulo === TITULO_ENCABEZADO) {
      parrafos.push(...parrafosDeMembrete(contenido));
      continue;
    }

    if (seccion.titulo === TITULO_PIE) {
      parrafos.push(...parrafosDeFirma(contenido));
      continue;
    }

    if (seccion.titulo === TITULO_RELATO) {
      parrafos.push(...parrafosDeContenido(contenido, formato));
      continue;
    }

    parrafos.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({ text: seccion.titulo.toUpperCase(), bold: true }),
        ],
      }),
      ...parrafosDeContenido(contenido, formato)
    );
  }

  return parrafos;
};

/** Genera el archivo Word del borrador y devuelve sus bytes. */
export const generarDocumentoWord = async ({
  titulo,
  secciones,
  formato = FORMATO_POR_DEFECTO,
}: {
  titulo: string;
  secciones: readonly SeccionBorrador[];
  formato?: FormatoDocumento;
}): Promise<Buffer> => {
  const documento = new Document({
    creator: "Guardia Virtual",
    title: titulo,
    description:
      "Borrador de documento policial generado como apoyo documental. Requiere revisión y firma del funcionario.",
    styles: {
      default: {
        document: {
          run: {
            font: formato.fuente,
            size: formato.tamanoPuntos * 2,
          },
          paragraph: {
            spacing: {
              line: Math.round(240 * formato.interlineado),
              lineRule: LineRuleType.AUTO,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(formato.margenesCm.superior * 10),
              bottom: convertMillimetersToTwip(
                formato.margenesCm.inferior * 10
              ),
              left: convertMillimetersToTwip(
                formato.margenesCm.izquierdo * 10
              ),
              right: convertMillimetersToTwip(formato.margenesCm.derecho * 10),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Página ", size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                  new TextRun({ text: " de ", size: 16 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
                ],
              }),
            ],
          }),
        },
        children: childrenDelDocumento(secciones, formato),
      },
    ],
  });

  return Packer.toBuffer(documento);
};

/** Nombre de archivo seguro a partir del título del documento. */
export const nombreArchivoWord = (titulo: string): string => {
  const base = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${base || "parte"}-${new Date().toISOString().slice(0, 10)}.docx`;
};
