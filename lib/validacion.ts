import { z } from "zod";

import { MENSAJE_MAXIMO, TAMANO_MAXIMO_CUERPO } from "./constantes";

/**
 * Validación de entradas — Guardia Virtual
 * ─────────────────────────────────────────
 * Nunca se confía en el cuerpo de la petición: se valida y se acota su
 * tamaño antes de procesarlo (y antes de gastar tokens del modelo).
 */

export { MENSAJE_MAXIMO, TAMANO_MAXIMO_CUERPO };

/** Longitud máxima de un campo de texto libre (especie, lugar, descripción). */
export const TEXTO_MAXIMO = 500;

/**
 * Lee el cuerpo JSON de la petición comprobando el tamaño.
 * Si excede el máximo, devuelve `null` (el llamador responde 413).
 */
export const leerJsonLimitado = async (
  request: Request,
  { maximo = TAMANO_MAXIMO_CUERPO }: { maximo?: number } = {}
): Promise<{ ok: true; datos: unknown } | { ok: false; motivo: "tamaño" | "formato" }> => {
  const cabecera = request.headers.get("content-length");

  if (cabecera && Number(cabecera) > maximo) {
    return { ok: false, motivo: "tamaño" };
  }

  const texto = await request.text();

  if (texto.length > maximo) {
    return { ok: false, motivo: "tamaño" };
  }

  if (!texto.trim()) {
    return { ok: true, datos: {} };
  }

  try {
    return { ok: true, datos: JSON.parse(texto) };
  } catch {
    return { ok: false, motivo: "formato" };
  }
};

/** Mensaje del funcionario: texto no vacío y acotado en longitud. */
export const esquemaMensaje = z.object({
  mensaje: z
    .string()
    .trim()
    .min(1, "El mensaje no puede estar vacío.")
    .max(
      MENSAJE_MAXIMO,
      `El mensaje supera los ${MENSAJE_MAXIMO} caracteres.`
    ),
});

/**
 * Metadatos del documento de origen y trazabilidad.
 * Se acotan las claves y los textos para no almacenar datos arbitrarios.
 */
export const esquemaDocumentoOrigen = z.object({
  origen: z
    .object({
      nombre: z.string().max(500),
      tipo: z.enum(["txt", "docx", "pdf"]),
      metodo: z.enum(["texto", "docx", "pdf"]),
      caracteres: z.number().int().nonnegative(),
      paginas: z.number().int().nonnegative().nullable(),
      hash: z.string().max(128),
      procesadoEn: z.string().max(64),
      advertencias: z.array(z.string().max(2_000)).max(20).default([]),
    })
    .optional(),
  plantilla: z
    .object({
      id: z.string().max(64),
      nombre: z.string().max(200),
      version: z.string().max(32),
    })
    .optional(),
  observaciones: z
    .array(
      z.object({
        nivel: z.enum(["error", "advertencia", "info"]),
        campo: z.string().max(200),
        mensaje: z.string().max(2_000),
      })
    )
    .max(100)
    .optional(),
  faltantes: z.array(z.string().max(500)).max(100).optional(),
  sinDestino: z.array(z.string().max(500)).max(100).optional(),
  trazabilidad: z.record(z.string(), z.unknown()).optional(),
});

/** Cuerpo de `POST /api/casos`. */
export const esquemaGuardarCaso = z.object({
  casoId: z.string().trim().min(1).max(64).optional().nullable(),
  confirmar: z.boolean().optional().default(false),
  antecedentes: z.record(z.string(), z.unknown()).optional().default({}),
  /** Trazabilidad del documento de origen (opcional). */
  documento: esquemaDocumentoOrigen.optional().nullable(),
  borrador: z
    .object({
      titulo: z.string().max(TEXTO_MAXIMO).optional(),
      textoCompleto: z.string().max(200_000).optional(),
      /** `id@version` de la plantilla usada. */
      plantilla: z.string().max(100).optional(),
      secciones: z
        .array(
          z.object({
            titulo: z.string().max(TEXTO_MAXIMO),
            contenido: z.string().max(50_000),
          })
        )
        .max(50)
        .optional(),
    })
    .optional(),
});

export type DatosGuardarCaso = z.infer<typeof esquemaGuardarCaso>;
