import { parseModelContent } from "./parse";

/**
 * Cliente de IA — Guardia Virtual
 * ───────────────────────────────
 * Capa única de acceso al modelo. Todos los proveedores con API compatible
 * con OpenAI se configuran **solo por variables de entorno**, sin tocar
 * código:
 *
 *   OpenRouter  https://openrouter.ai/api/v1/chat/completions
 *   OpenAI      https://api.openai.com/v1/chat/completions
 *   Gemini      https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 *   Groq        https://api.groq.com/openai/v1/chat/completions
 *   Mistral     https://api.mistral.ai/v1/chat/completions
 *
 * Variables:
 *   AI_BASE_URL   → endpoint completo (por defecto OpenRouter)
 *   AI_API_KEY    → clave del proveedor
 *   AI_MODEL      → identificador del modelo
 */

export type MensajeModelo = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpcionesModelo = {
  /** 0 = determinista (extracción), 0.2 = redacción. */
  temperatura?: number;
};

const BASE_URL_POR_DEFECTO = "https://openrouter.ai/api/v1/chat/completions";

export const ERROR_SIN_CLAVE =
  "Falta la clave de la API de IA (AI_API_KEY u OPENROUTER_API_KEY).";

const obtenerBaseUrl = (): string =>
  process.env.AI_BASE_URL?.trim() || BASE_URL_POR_DEFECTO;

const obtenerApiKey = (): string | null =>
  process.env.AI_API_KEY?.trim() ||
  process.env.OPENROUTER_API_KEY?.trim() ||
  process.env.OPENAI_API_KEY?.trim() ||
  null;

const obtenerModelo = (): string =>
  process.env.AI_MODEL?.trim() ||
  process.env.OPENROUTER_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  "openai/gpt-4o-mini";

/** `true` si hay clave configurada para el proveedor. */
export const hayClaveDeIA = (): boolean => Boolean(obtenerApiKey());

/** Nombre del modelo configurado (para diagnóstico). */
export const modeloConfigurado = (): string => obtenerModelo();

/** Llama al modelo y devuelve el contenido de texto de la respuesta. */
export const llamarModelo = async (
  mensajes: MensajeModelo[],
  { temperatura = 0 }: OpcionesModelo = {}
): Promise<string> => {
  const apiKey = obtenerApiKey();

  if (!apiKey) {
    throw new Error(ERROR_SIN_CLAVE);
  }

  const cabeceras: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // Cabeceras opcionales de OpenRouter (ranking de apps y título).
  if (obtenerBaseUrl().includes("openrouter.ai")) {
    cabeceras["HTTP-Referer"] =
      process.env.AI_SITE_URL?.trim() || "http://localhost:3000";
    cabeceras["X-Title"] = "Guardiavirtual";
  }

  const response = await fetch(obtenerBaseUrl(), {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({
      model: obtenerModelo(),
      temperature: temperatura,
      response_format: { type: "json_object" },
      messages: mensajes,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`La API de IA falló: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("La respuesta de la API no incluye contenido válido.");
  }

  return content;
};

/** Llama al modelo y devuelve el objeto JSON de la respuesta. */
export const llamarModeloJson = async (
  mensajes: MensajeModelo[],
  opciones?: OpcionesModelo
): Promise<unknown> => parseModelContent(await llamarModelo(mensajes, opciones));
