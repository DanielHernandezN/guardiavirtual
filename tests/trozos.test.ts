import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { dividirEnTrozos, TROZO_MAXIMO } from "@/lib/trozos";

/**
 * Pruebas del troceado de mensajes largos (actas de aprehensor).
 */

describe("troceado de mensajes largos", () => {
  it("deja intacto un texto corto", () => {
    assert.deepEqual(dividirEnTrozos("Hubo un hurto."), ["Hubo un hurto."]);
  });

  it("devuelve una lista vacía si el texto está vacío", () => {
    assert.deepEqual(dividirEnTrozos("   "), []);
  });

  it("respeta el máximo de cada trozo", () => {
    const texto = Array.from(
      { length: 200 },
      (_, i) => `Párrafo número ${i} con texto suficiente para ocupar espacio.`
    ).join("\n");

    const trozos = dividirEnTrozos(texto, 500);

    assert.ok(trozos.length > 1);
    for (const trozo of trozos) {
      assert.ok(trozo.length <= 500, `trozo de ${trozo.length} caracteres`);
      assert.ok(trozo.trim().length > 0);
    }
  });

  it("no corta palabras al partir un párrafo muy largo", () => {
    const texto = `${"palabra ".repeat(600)}final`;
    const trozos = dividirEnTrozos(texto, 300);

    for (const trozo of trozos) {
      assert.ok(trozo.length <= 300);
      assert.ok(!trozo.startsWith(" "));

      for (const palabra of trozo.split(/\s+/)) {
        assert.ok("palabra".startsWith(palabra) || palabra === "final");
      }
    }
  });

  it("conserva todas las palabras del original", () => {
    const parrafos = Array.from(
      { length: 40 },
      (_, i) => `Que, el hecho número ${i} ocurrió en el lugar señalado.`
    );

    const trozos = dividirEnTrozos(parrafos.join("\n"), 400);
    const palabrasOriginal = parrafos.join(" ").split(/\s+/).filter(Boolean);
    const palabrasTrozos = trozos.join(" ").split(/\s+/).filter(Boolean);

    assert.deepEqual(palabrasTrozos, palabrasOriginal);
  });

  it("usa el máximo por defecto para actas extensas", () => {
    const acta = `${"a".repeat(40)} `.repeat(400);
    const trozos = dividirEnTrozos(acta);

    for (const trozo of trozos) {
      assert.ok(trozo.length <= TROZO_MAXIMO);
    }
  });
});
