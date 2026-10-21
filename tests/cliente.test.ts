import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ErrorDeApi, pedirJson } from "@/lib/cliente";
import { tituloPorTipo } from "@/lib/plantillas";
import { SECCIONES_PARTE } from "@/lib/plantillas";

/**
 * Pruebas del cliente HTTP del frontend.
 * Se simula `fetch` para verificar el manejo de errores y respuestas no JSON.
 */

const conFetchSimulado = (
  fn: () => Promise<Response>,
  accion: () => Promise<unknown>
): Promise<unknown> => {
  const original = globalThis.fetch;

  globalThis.fetch = fn as unknown as typeof fetch;

  return accion().finally(() => {
    globalThis.fetch = original;
  });
};

describe("cliente HTTP", () => {
  it("devuelve los datos de una respuesta correcta", async () => {
    const resultado = await conFetchSimulado(
      async () =>
        new Response(JSON.stringify({ casos: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      () => pedirJson<{ casos: unknown[] }>("/api/casos")
    );

    assert.deepEqual(resultado, { casos: [] });
  });

  it("lanza ErrorDeApi con el mensaje del servidor", async () => {
    await assert.rejects(
      conFetchSimulado(
        async () =>
          new Response(JSON.stringify({ error: "No autenticado." }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
        () => pedirJson("/api/casos")
      ),
      (error: unknown) => {
        assert.ok(error instanceof ErrorDeApi);
        assert.equal(error.status, 401);
        assert.equal(error.message, "No autenticado.");
        assert.equal(error.esSesionInvalida, true);
        return true;
      }
    );
  });

  it("usa el código HTTP cuando la respuesta no es JSON", async () => {
    await assert.rejects(
      conFetchSimulado(
        async () => new Response("Error interno", { status: 500 }),
        () => pedirJson("/api/casos")
      ),
      (error: unknown) => {
        assert.ok(error instanceof ErrorDeApi);
        assert.equal(error.status, 500);
        assert.ok(error.message.includes("500"));
        return true;
      }
    );
  });

  it("reporta la falta de conexión", async () => {
    await assert.rejects(
      conFetchSimulado(
        async () => {
          throw new Error("fetch failed");
        },
        () => pedirJson("/api/casos")
      ),
      (error: unknown) => {
        assert.ok(error instanceof ErrorDeApi);
        assert.equal(error.status, 0);
        assert.equal(error.message, "No hay conexión con el servidor.");
        return true;
      }
    );
  });

  it("no marca como sesión inválida los errores de servidor", async () => {
    await assert.rejects(
      conFetchSimulado(
        async () =>
          new Response(JSON.stringify({ error: "Falla" }), { status: 500 }),
        () => pedirJson("/api/casos")
      ),
      (error: unknown) => {
        assert.ok(error instanceof ErrorDeApi);
        assert.equal(error.esSesionInvalida, false);
        return true;
      }
    );
  });
});

describe("plantillas del parte", () => {
  it("incluye las secciones oficiales", () => {
    assert.ok(SECCIONES_PARTE.length > 0);
  });

  it("devuelve un título genérico si el tipo es desconocido", () => {
    assert.equal(tituloPorTipo("otro tipo"), "PARTE POLICIAL");
  });
});
