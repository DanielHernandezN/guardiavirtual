import { parseModelContent } from "./parse";
import { ErrorLimiteProveedor, ErrorTiempoAgotado } from "./errores";

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
 *   Groq        https://api.groq.com/openai/chat/completions
 *   Mistral     https://api.mistral.ai/v1/chat/completions
 *
 * Variables:
 *   AI_BASE_URL        → endpoint completo (por defecto OpenRouter)
 *   AI_API_KEY         → clave del proveedor
 *   AI_MODEL           → modelo de extracción (chat)
 *   AI_MODEL_REDACCION → modelo de redacción del borrador (opcional)
 *
 * Ante respuestas vacías, errores 5xx, 429 o fallos de red, la llamada se
 * reintenta hasta 3 veces con una espera creciente.
 */

export type MensajeModelo = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpcionesModelo = {
  /** 0 = determinista (extracción), 0.2 = redacción. */
  temperatura?: number;
  /** Tiempo máximo de espera de la respuesta, en milisegundos. */
  timeoutMs?: number;
  /** Intentos ante respuestas vacías o fallos transitorios. */
  intentos?: number;
  /** Modelo alternativo para esta llamada (por ejemplo, el de redacción). */
  modelo?: string;
};

const BASE_URL_POR_DEFECTO = "https://openrouter.ai/api/v1/chat/completions";

/** Tiempo máximo por defecto para esperar al modelo (2 minutos). */
export const TIMEOUT_POR_DEFECTO_MS = 120_000;

/** Intentos por defecto ante respuestas vacías o fallos transitorios. */
const INTENTOS_POR_DEFECTO = 3;

/** Espera base entre reintentos (se multiplica por el número de intento). */
const ESPERA_REINTENTO_MS = 800;

export const ERROR_SIN_CLAVE =
  "Falta la clave de la API de IA (AI_API_KEY u OPENROUTER_API_KEY).";

const obtenerBaseUrl = (): string =>
  process.env.AI_BASE_URL?.trim() || BASE_URL_POR_DEFECTO;

const obtenerApiKey = (): string | null =>
  process.env.AI_API_KEY?.trim() ||
  process.env.OPENROUTER_API_KEY?.trim() ||
  process.env.OPENAI_API_KEY?.trim() ||
  null;

const obtenerModelo = (modelo?: string): string =>
  modelo?.trim() ||
  process.env.AI_MODEL?.trim() ||
  process.env.OPENROUTER_MODEL?.trim() ||
  process.env.OPENAI_MODEL?.trim() ||
  "openai/gpt-4o-mini";

/** `true` si hay clave configurada para el proveedor. */
export const hayClaveDeIA = (): boolean => Boolean(obtenerApiKey());

/** Nombre del modelo configurado (para diagnóstico). */
export const modeloConfigurado = (): string => obtenerModelo();

/** Espera asíncrona entre reintentos. */
const esperar = (ms: number): Promise<void> =>
  new Promise((resolver) => setTimeout(resolver, ms));

/**
 * Llama al modelo y devuelve el contenido de texto de la respuesta.
 *
 * Aplica un tiempo máximo de espera (`timeoutMs`) para que una llamada
 * colgada no deje al funcionario esperando indefinidamente. Reintenta ante
 * respuestas vacías, errores 5xx, 429 y fallos de red: los modelos gratuitos
 * suelen fallar de forma intermitente.
 */
export const llamarModelo = async (
  mensajes: MensajeModelo[],
  {
    temperatura = 0,
    timeoutMs = TIMEOUT_POR_DEFECTO_MS,
    intentos = INTENTOS_POR_DEFECTO,
    modelo,
  }: OpcionesModelo = {}
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

  const cuerpo = JSON.stringify({
    model: obtenerModelo(modelo),
    temperature: temperatura,
    response_format: { type: "json_object" },
    messages: mensajes,
  });

  const totalIntentos = Math.max(1, intentos);
  let ultimoError: unknown = null;

  for (let intento = 1; intento <= totalIntentos; intento++) {
    let response: Response;

    try {
      response = await fetch(obtenerBaseUrl(), {
        method: "POST",
        headers: cabeceras,
        body: cuerpo,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // El timeout de `AbortSignal` lanza un DOMException con nombre
      // "TimeoutError". No se reintenta: el modelo ya tuvo su tiempo.
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new ErrorTiempoAgotado();
      }

      ultimoError = error;

      if (intento < totalIntentos) {
        console.warn(
          `[ia] fallo de red en el intento ${intento}/${totalIntentos}; reintentando...`
        );
        await esperar(ESPERA_REINTENTO_MS * intento);
        continue;
      }

      throw error;
    }

    if (!response.ok) {
      // 429: el proveedor agotó la cuota o el límite por minuto.
      if (response.status === 429) {
        ultimoError = new ErrorLimiteProveedor();

        if (intento < totalIntentos) {
          const segundos = Number(response.headers.get("retry-after") ?? 0);
          const espera = Math.min(
            5_000,
            segundos > 0 ? segundos * 1000 : ESPERA_REINTENTO_MS * intento
          );

          console.warn(
            `[ia] límite del proveedor en el intento ${intento}/${totalIntentos}; reintentando en ${espera} ms...`
          );
          await esperar(espera);
          continue;
        }

        throw ultimoError;
      }

      const errorText = await response.text();
      ultimoError = new Error(`La API de IA falló: ${errorText}`);

      // Los 5xx son transitorios; los 4xx no se reintentan.
      if (response.status >= 500 && intento < totalIntentos) {
        console.warn(
          `[ia] error ${response.status} en el intento ${intento}/${totalIntentos}; reintentando...`
        );
        await esperar(ESPERA_REINTENTO_MS * intento);
        continue;
      }

      throw ultimoError;
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };

    try {
      data = (await response.json()) as typeof data;
    } catch (error) {
      ultimoError = error;

      if (intento < totalIntentos) {
        console.warn(
          `[ia] respuesta no JSON en el intento ${intento}/${totalIntentos}; reintentando...`
        );
        await esperar(ESPERA_REINTENTO_MS * intento);
        continue;
      }

      throw new Error("La respuesta de la API no es JSON válido.");
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      ultimoError = new Error(
        "La respuesta de la API no incluye contenido válido."
      );

      if (intento < totalIntentos) {
        console.warn(
          `[ia] respuesta vacía en el intento ${intento}/${totalIntentos}; reintentando...`
        );
        await esperar(ESPERA_REINTENTO_MS * intento);
        continue;
      }

      throw ultimoError;
    }

    return content;
  }

  throw ultimoError instanceof Error
    ? ultimoError
    : new Error("La API de IA no devolvió una respuesta válida.");
};

/** Llama al modelo y devuelve el objeto JSON de la respuesta. */
export const llamarModeloJson = async (
  mensajes: MensajeModelo[],
  opciones?: OpcionesModelo
): Promise<unknown> => parseModelContent(await llamarModelo(mensajes, opciones));
