import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { ERROR_SIN_CLAVE, llamarModelo, modeloConfigurado } from "@/lib/ia";

/**
 * Pruebas del cliente de IA.
 *
 * Verifican que el reseller OpenCode (Console) se seleccione solo con su
 * variable de entorno, que Muse Spark 1.3 sea el modelo por defecto en ese
 * caso y que la llamada use el contrato de OpenAI (Chat Completions).
 */

const VARIABLES = [
  "AI_BASE_URL",
  "AI_API_KEY",
  "AI_MODEL",
  "OPENCODE_API_KEY",
  "OPENCODE_APIKEY",
  "OPENCODE_MODEL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
] as const;

const originales = new Map<string, string | undefined>();
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  for (const nombre of VARIABLES) {
    originales.set(nombre, process.env[nombre]);
    delete process.env[nombre];
  }
});

afterEach(() => {
  for (const nombre of VARIABLES) {
    const valor = originales.get(nombre);
    if (valor === undefined) delete process.env[nombre];
    else process.env[nombre] = valor;
  }

  originales.clear();
  globalThis.fetch = fetchOriginal;
});

type Llamada = {
  url: string;
  headers: Record<string, string>;
  cuerpo: Record<string, unknown>;
};

/** Sustituye `fetch` y registra la petición que hace el cliente de IA. */
const interceptarFetch = (contenido = '{"ok":true}'): Llamada[] => {
  const llamadas: Llamada[] = [];

  globalThis.fetch = (async (
    entrada: RequestInfo | URL,
    init?: RequestInit
  ) => {
    llamadas.push({
      url: String(entrada),
      headers: (init?.headers ?? {}) as unknown as Record<string, string>,
      cuerpo: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });

    return new Response(
      JSON.stringify({ choices: [{ message: { content: contenido } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  return llamadas;
};

describe("cliente de IA con OpenCode", () => {
  it("usa el endpoint de OpenCode y Muse Spark 1.3 con OPENCODE_API_KEY", async () => {
    process.env.OPENCODE_API_KEY = "oc_sk_prueba";
    const llamadas = interceptarFetch();

    const texto = await llamarModelo([{ role: "user", content: "hola" }]);

    assert.equal(texto, '{"ok":true}');
    assert.equal(llamadas.length, 1);
    assert.equal(
      llamadas[0].url,
      "https://opencode.ai/inference/openai/v1/chat/completions"
    );
    assert.equal(llamadas[0].headers.Authorization, "Bearer oc_sk_prueba");
    assert.equal(llamadas[0].cuerpo.model, "muse-spark-1.3");
  });

  it("acepta el alias OPENCODE_APIKEY creado en Vercel", async () => {
    process.env.OPENCODE_APIKEY = "oc_sk_alias";
    const llamadas = interceptarFetch();

    await llamarModelo([{ role: "user", content: "hola" }]);

    assert.equal(
      llamadas[0].url,
      "https://opencode.ai/inference/openai/v1/chat/completions"
    );
    assert.equal(llamadas[0].headers.Authorization, "Bearer oc_sk_alias");
    assert.equal(llamadas[0].cuerpo.model, "muse-spark-1.3");
  });

  it("reconoce una clave oc_sk_ en la variable genérica AI_API_KEY", async () => {
    process.env.AI_API_KEY = "oc_sk_generica";
    const llamadas = interceptarFetch();

    await llamarModelo([{ role: "user", content: "hola" }]);

    assert.equal(
      llamadas[0].url,
      "https://opencode.ai/inference/openai/v1/chat/completions"
    );
    assert.equal(llamadas[0].cuerpo.model, "muse-spark-1.3");
  });

  it("respeta AI_BASE_URL y AI_MODEL cuando se configuran a mano", async () => {
    process.env.OPENCODE_API_KEY = "oc_sk_prueba";
    process.env.AI_BASE_URL = "https://ejemplo.test/v1/chat/completions";
    process.env.AI_MODEL = "otro-modelo";
    const llamadas = interceptarFetch();

    await llamarModelo([{ role: "user", content: "hola" }]);

    assert.equal(llamadas[0].url, "https://ejemplo.test/v1/chat/completions");
    assert.equal(llamadas[0].cuerpo.model, "otro-modelo");
  });

  it("con endpoint de OpenCode prefiere su clave específica", async () => {
    process.env.AI_BASE_URL =
      "https://opencode.ai/inference/openai/v1/chat/completions";
    process.env.AI_API_KEY = "sk-or-v1-antigua";
    process.env.OPENCODE_API_KEY = "oc_sk_prueba";
    const llamadas = interceptarFetch();

    await llamarModelo([{ role: "user", content: "hola" }]);

    assert.equal(llamadas[0].headers.Authorization, "Bearer oc_sk_prueba");
    assert.equal(llamadas[0].cuerpo.model, "muse-spark-1.3");
  });

  it("prioriza OPENCODE_API_KEY sobre una clave genérica anterior", async () => {
    process.env.AI_API_KEY = "sk-or-v1-prueba";
    process.env.OPENCODE_API_KEY = "oc_sk_prueba";
    const llamadas = interceptarFetch();

    await llamarModelo([{ role: "user", content: "hola" }]);

    assert.equal(
      llamadas[0].url,
      "https://opencode.ai/inference/openai/v1/chat/completions"
    );
    assert.equal(llamadas[0].headers.Authorization, "Bearer oc_sk_prueba");
    assert.equal(llamadas[0].cuerpo.model, "muse-spark-1.3");
  });

  it("un AI_BASE_URL explícito manda sobre OPENCODE_API_KEY", async () => {
    process.env.AI_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
    process.env.AI_API_KEY = "sk-or-v1-prueba";
    process.env.OPENCODE_API_KEY = "oc_sk_prueba";
    const llamadas = interceptarFetch();

    await llamarModelo([{ role: "user", content: "hola" }]);

    assert.equal(
      llamadas[0].url,
      "https://openrouter.ai/api/v1/chat/completions"
    );
    assert.equal(llamadas[0].headers.Authorization, "Bearer sk-or-v1-prueba");
  });

  it("permite elegir otro modelo de OpenCode para una llamada", async () => {
    process.env.OPENCODE_API_KEY = "oc_sk_prueba";
    const llamadas = interceptarFetch();

    await llamarModelo([{ role: "user", content: "hola" }], {
      modelo: "muse-spark-1.2",
    });

    assert.equal(llamadas[0].cuerpo.model, "muse-spark-1.2");
  });

  it("falla con un mensaje claro si no hay ninguna clave", async () => {
    await assert.rejects(
      () => llamarModelo([{ role: "user", content: "hola" }]),
      { message: ERROR_SIN_CLAVE }
    );
  });

  it("informa Muse Spark 1.3 como modelo configurado", () => {
    process.env.OPENCODE_API_KEY = "oc_sk_prueba";

    assert.equal(modeloConfigurado(), "muse-spark-1.3");
  });
});
