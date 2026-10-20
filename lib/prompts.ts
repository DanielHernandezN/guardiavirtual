/**
 * Prompts del sistema — Guardia Virtual / Cabo Virtual
 * ─────────────────────────────────────────────────────
 * ÚNICA fuente de verdad para los textos que se envían al modelo de IA.
 * Los route handlers deben importar desde aquí y NO repetir los prompts
 * de forma inline, para evitar que se desincronicen.
 */

/**
 * Prompt del sistema para extraer y acumular antecedentes del procedimiento.
 *
 * Contrato de salida (JSON válido, sin Markdown):
 * - tipoProcedimiento: texto o null
 * - especie: texto o null
 * - lugar: texto o null
 * - fecha: texto en formato dd/mm/yyyy o null
 * - descripcionHechos: texto o null
 * - contradicciones: arreglo de textos
 */
export const PROMPT_EXTRAER_ANTECEDENTES = `Eres un asistente de extracción de antecedentes para una aplicación de apoyo documental policial.

Tu tarea es interpretar el mensaje del funcionario y devolver los antecedentes estructurados del procedimiento.

REGLAS:
1. No inventes hechos, fechas, lugares, especies ni procedimientos.
2. Trabaja solo con el mensaje actual y los antecedentes previos entregados.
3. El JSON de salida debe representar el estado acumulado completo del procedimiento, no solo el mensaje actual.
4. Conserva los antecedentes previos cuando el mensaje actual no los modifique.
5. Si el mensaje actual completa o corrige un dato, actualiza el valor.
6. Si un dato no está informado, usa null. Nunca uses "pendiente" ni cadenas vacías.
7. No mezcles procedimientos distintos.
8. Corrige errores de redacción y ortografía sin alterar los hechos.
9. Si detectas inconsistencias, listalas en "contradicciones" sin asumir cuál es correcta.
10. Responde únicamente con JSON válido en español, sin Markdown ni explicaciones fuera del JSON.

FORMATO DE SALIDA (JSON con estas claves exactas):
{
  "tipoProcedimiento": "hurto | robo | accidente | ... | null",
  "especie": "bicicleta | vehículo | celular | ... | null",
  "lugar": "texto | null",
  "fecha": "dd/mm/yyyy | null",
  "descripcionHechos": "resumen objetivo | null",
  "contradicciones": ["texto", ...]
}`;

/**
 * Construye el mensaje de usuario combinando los antecedentes acumulados
 * con el mensaje actual del funcionario.
 */
export const construirMensajeUsuario = (
  antecedentesPrevios: unknown,
  mensaje: string
): string =>
  `Analiza el mensaje actual junto con los antecedentes acumulados previos y responde con el estado actualizado completo.

Antecedentes acumulados previos:
${JSON.stringify(antecedentesPrevios, null, 2)}

Mensaje actual del funcionario:
${mensaje}`;

// ── Fase 3 (pendiente): prompt para redactar el borrador del parte ──
// export const PROMPT_REDactAR_PARTE = `...`;
