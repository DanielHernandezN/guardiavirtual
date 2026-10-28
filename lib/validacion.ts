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

/** Cuerpo de `POST /api/casos`. */
export const esquemaGuardarCaso = z.object({
  casoId: z.string().trim().min(1).max(64).optional().nullable(),
  confirmar: z.boolean().optional().default(false),
  antecedentes: z.record(z.string(), z.unknown()).optional().default({}),
  borrador: z
    .object({
      titulo: z.string().max(TEXTO_MAXIMO).optional(),
      textoCompleto: z.string().max(200_000).optional(),
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
