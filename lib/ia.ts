import { parseModelContent } from "./parse";
import { ErrorLimiteProveedor, ErrorTiempoAgotado } from "./errores";

/**
 * Cliente de IA — Guardia Virtual
 * ───────────────────────────────
 * Capa única de acceso al modelo. Todos los proveedores con API compatible
 * con OpenAI se configuran **solo por variables de entorno**, sin tocar
 * código:
 *
 *   OpenCode    https://opencode.ai/inference/openai/v1/chat/completions
 *   OpenRouter  https://openrouter.ai/api/v1/chat/completions
 *   OpenAI      https://api.openai.com/v1/chat/completions
 *   Gemini      https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 *   Groq        https://api.groq.com/openai/v1/chat/completions
 *   Mistral     https://api.mistral.ai/v1/chat/completions
 *
 * OpenCode (Console) es el reseller recomendado para Muse Spark 1.3. Basta
 * con definir `OPENCODE_API_KEY`; el endpoint y el modelo se eligen solos.
 *
 * Variables:
 *   AI_BASE_URL        → endpoint completo (por defecto OpenCode u OpenRouter)
 *   AI_API_KEY         → clave del proveedor (alternativa genérica)
 *   OPENCODE_API_KEY   → clave del reseller OpenCode (prefijo oc_sk_)
 *                        también se acepta el alias OPENCODE_APIKEY
 *   AI_MODEL           → modelo de extracción (chat)
 *   AI_MODEL_REDACCION → modelo de redacción del borrador (opcional)
 *   OPENCODE_MODEL     → modelo de OpenCode si no se define AI_MODEL
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
  /** Tope de tokens de salida (por defecto 2000; Groq corta con el valor bajo del proveedor y limita a 8000 TPM). */
  maxTokens?: number;
};

const BASE_URL_POR_DEFECTO = "https://openrouter.ai/api/v1/chat/completions";

/** Endpoint del reseller OpenCode (Console), compatible con OpenAI. */
const BASE_URL_OPENCODE =
  "https://opencode.ai/inference/openai/v1/chat/completions";

/** Modelo de Muse Spark servido por OpenCode. */
const MODELO_OPENCODE_POR_DEFECTO = "muse-spark-1.3";

/** Modelo genérico de respaldo para cualquier proveedor compatible. */
const MODELO_POR_DEFECTO = "openai/gpt-4o-mini";

/** Tiempo máximo por defecto para esperar al modelo (2 minutos). */
export const TIMEOUT_POR_DEFECTO_MS = 120_000;

/** Intentos por defecto ante respuestas vacías o fallos transitorios. */
const INTENTOS_POR_DEFECTO = 3;

/** Espera base entre reintentos (se multiplica por el número de intento). */
const ESPERA_REINTENTO_MS = 800;

export const ERROR_SIN_CLAVE =
  "Falta la clave de la API de IA (AI_API_KEY, OPENCODE_API_KEY/OPENCODE_APIKEY u OPENROUTER_API_KEY).";

/** `true` si la clave tiene el formato de OpenCode Console (`oc_sk_...`). */
const esClaveOpenCode = (clave?: string): boolean =>
  Boolean(clave?.trim()?.startsWith("oc_sk_"));

/**
 * Clave de OpenCode.
 *
 * El nombre canónico es `OPENCODE_API_KEY`; se acepta además
 * `OPENCODE_APIKEY` (sin guion bajo) para tolerar variables ya creadas en
 * Vercel con ese nombre.
 */
const obtenerClaveOpenCode = (): string | undefined =>
  process.env.OPENCODE_API_KEY?.trim() ||
  process.env.OPENCODE_APIKEY?.trim() ||
  undefined;

/**
 * `true` si la configuración apunta al reseller OpenCode.
 *
 * Prioridad: endpoint explícito → `OPENCODE_API_KEY` → clave genérica con
 * formato `oc_sk_`. Así definir `OPENCODE_API_KEY` basta para cambiar de
 * proveedor, pero `AI_BASE_URL` sigue mandando si se configura a mano.
 */
const esOpenCode = (): boolean => {
  const baseUrl = process.env.AI_BASE_URL?.trim();
  if (baseUrl) return baseUrl.includes("opencode.ai");

  if (obtenerClaveOpenCode()) return true;

  return esClaveOpenCode(process.env.AI_API_KEY);
};

const obtenerBaseUrl = (): string =>
  process.env.AI_BASE_URL?.trim() ||
  (esOpenCode() ? BASE_URL_OPENCODE : BASE_URL_POR_DEFECTO);

const obtenerApiKey = (): string | null => {
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const claveGenerica = process.env.AI_API_KEY?.trim();
  const claveOpenCode = obtenerClaveOpenCode();
  const respaldo =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null;

  // Endpoint explícito: manda la clave del proveedor al que apunta.
  if (baseUrl) {
    return baseUrl.includes("opencode.ai")
      ? claveOpenCode || claveGenerica || respaldo
      : claveGenerica || claveOpenCode || respaldo;
  }

  // Sin endpoint, la clave específica de OpenCode cambia el proveedor.
  return claveOpenCode || claveGenerica || respaldo;
};

const obtenerModelo = (modelo?: string): string => {
  const explicito = modelo?.trim() || process.env.AI_MODEL?.trim();

  if (explicito) return explicito;

  if (esOpenCode()) {
    return process.env.OPENCODE_MODEL?.trim() || MODELO_OPENCODE_POR_DEFECTO;
  }

  return (
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    MODELO_POR_DEFECTO
  );
};

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
    maxTokens = 2000,
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

  // Groq: los modelos gpt-oss razonan antes de responder y esos tokens
  // cuentan en el TPM gratuito (8000). Con esfuerzo bajo basta para el JSON.
  const cuerpo = JSON.stringify({
    model: obtenerModelo(modelo),
    temperature: temperatura,
    max_tokens: maxTokens,
    ...(obtenerBaseUrl().includes("groq.com")
      ? { reasoning_effort: "low" }
      : {}),
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
            65_000,
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
