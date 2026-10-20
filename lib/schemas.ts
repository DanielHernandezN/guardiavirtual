import { z } from "zod";
import { normalizarFecha } from "./fecha";

/**
 * Esquemas de validación — Guardia Virtual
 * ───────────────────────────────────────
 * Valida y normaliza la salida del modelo de IA. Es la frontera entre
 * "lo que el modelo devuelve" (texto libre en JSON) y el contrato de
 * datos tipado que consume el resto de la aplicación.
 *
 * Reglas de normalización:
 * - Los textos vacíos, "pendiente", "null", "nulo", "no informado" o
 *   "sin información" se convierten en `null`.
 * - Los números se convierten a texto.
 * - `contradicciones` siempre es un arreglo de textos (vacío si no aplica).
 */

const VALORES_VACIOS = new Set([
  "pendiente",
  "null",
  "nulo",
  "no informado",
  "sin informacion",
  "sin información",
]);

/** Campo de texto opcional: normaliza a `string | null`. */
const textoNullable = z.preprocess((valor) => {
  if (typeof valor === "string") {
    const texto = valor.trim();
    if (!texto || VALORES_VACIOS.has(texto.toLowerCase())) {
      return null;
    }
    return texto;
  }

  if (typeof valor === "number") {
    return String(valor);
  }

  return null;
}, z.string().nullable());

/**
 * Campo de fecha: normaliza a `dd/mm/yyyy`.
 * Si el formato no es reconocible, devuelve `null` (no se inventa la fecha).
 */
const textoFecha = z.preprocess((valor) => {
  if (typeof valor === "string") {
    const texto = valor.trim();
    if (!texto || VALORES_VACIOS.has(texto.toLowerCase())) {
      return null;
    }
    return normalizarFecha(texto);
  }

  if (typeof valor === "number") {
    return normalizarFecha(String(valor));
  }

  return null;
}, z.string().nullable());

/** Lista de textos: acepta cualquier entrada y devuelve `string[]` limpio. */
const listaDeTextos = z.preprocess((valor) => {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()));

/**
 * Esquema de los antecedentes estructurados que debe devolver el modelo.
 * Coincide con `Antecedentes` en `lib/types.ts`.
 */
export const esquemaAntecedentes = z.object({
  tipoProcedimiento: textoNullable,
  especie: textoNullable,
  lugar: textoNullable,
  fecha: textoFecha,
  descripcionHechos: textoNullable,
  contradicciones: listaDeTextos,
});

export type AntecedentesValidados = z.infer<typeof esquemaAntecedentes>;

/**
 * Esquema del borrador del parte policial devuelto por el modelo.
 * Coincide con la estructura de `SeccionBorrador` en `lib/types.ts`.
 */
export const esquemaBorrador = z.object({
  secciones: z.array(
    z.object({
      titulo: z.string(),
      contenido: z.string(),
    })
  ),
});

export type BorradorValidado = z.infer<typeof esquemaBorrador>;
