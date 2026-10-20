/**
 * Parseo de la salida del modelo — Guardia Virtual
 * ─────────────────────────────────────────────────
 * Los modelos a veces envuelven el JSON en texto o Markdown. Este helper
 * extrae el primer objeto JSON válido del contenido recibido.
 */

export const parseModelContent = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("No se pudo parsear la respuesta JSON del modelo.");
    }

    return JSON.parse(match[0]);
  }
};
