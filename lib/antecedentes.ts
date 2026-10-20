import { CAMPOS_OBLIGATORIOS, type Antecedentes } from "./types";

/**
 * Utilidades de dominio — Guardia Virtual
 * ───────────────────────────────────────
 * Funciones puras que operan sobre los antecedentes: detección de campos
 * faltantes y generación de mensajes conversacionales para el funcionario.
 */

/** Devuelve las etiquetas de los campos obligatorios que aún faltan. */
export const camposFaltantes = (antecedentes: Antecedentes): string[] =>
  CAMPOS_OBLIGATORIOS.filter(({ key }) => !antecedentes[key]).map(
    ({ label }) => label
  );

/** Formatea una lista en español: "a", "a y b", "a, b y c". */
export const formatoLista = (items: string[]): string => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
};

/** Genera el mensaje conversacional según los campos que falten. */
export const crearRespuestaConversacional = (faltantes: string[]): string => {
  if (faltantes.length === 0) {
    return "Con los antecedentes disponibles puedo continuar con la confección del borrador.";
  }

  return `Para continuar necesito que indiques ${formatoLista(faltantes)}.`;
};
