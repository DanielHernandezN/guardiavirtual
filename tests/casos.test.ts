import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extraerPendientes,
  parseAntecedentes,
  parseSecciones,
  tituloDeCaso,
} from "@/lib/casos";
import { tituloPorTipo, SECCIONES_PARTE } from "@/lib/plantillas";
import { parseModelContent } from "@/lib/parse";

/**
 * Pruebas de la capa de casos y del parseo de la salida del modelo.
 */

describe("título del caso", () => {
  it("combina tipo y especie", () => {
    assert.equal(tituloDeCaso({ tipoProcedimiento: "hurto", especie: "bicicleta" }), "Hurto de bicicleta");
  });

  it("usa solo el tipo si no hay especie", () => {
    assert.equal(tituloDeCaso({ tipoProcedimiento: "robo", especie: null }), "Robo");
  });

  it("usa un texto por defecto si no hay datos", () => {
    assert.equal(tituloDeCaso({}), "Caso sin identificar");
  });
});

describe("título del parte", () => {
  it("mapea los tipos conocidos", () => {
    assert.equal(tituloPorTipo("hurto"), "PARTE DE HURTO");
    assert.equal(tituloPorTipo("accidente de transito"), "PARTE DE ACCIDENTE DE TRÁNSITO");
    assert.equal(tituloPorTipo("violencia intrafamiliar"), "PARTE DE VIOLENCIA INTRAFAMILIAR");
  });

  it("usa un título genérico para tipos desconocidos", () => {
    assert.equal(tituloPorTipo("procedimiento raro"), "PARTE POLICIAL");
    assert.equal(tituloPorTipo(null), "PARTE POLICIAL");
  });

  it("expone las secciones oficiales del parte", () => {
    assert.deepEqual([...SECCIONES_PARTE], [
      "ANTECEDENTES",
      "HECHOS",
      "ESPECIES INVOLUCRADAS",
      "CONCLUSIÓN",
    ]);
  });
});

describe("pendientes del borrador", () => {
  it("detecta los campos que quedaron como [PENDIENTE]", () => {
    const pendientes = extraerPendientes([
      {
        titulo: "HECHOS",
        contenido:
          "El hecho ocurrió el [PENDIENTE] en la calle principal. La especie fue [PENDIENTE].",
      },
    ]);

    assert.equal(pendientes.length, 1);
    assert.equal(pendientes[0].titulo, "HECHOS");
    assert.equal(pendientes[0].pendientes.length, 2);
  });

  it("no reporta pendientes cuando no hay marcadores", () => {
    const pendientes = extraerPendientes([
      { titulo: "HECHOS", contenido: "El hecho ocurrió a las 10:00." },
    ]);

    assert.deepEqual(pendientes, []);
  });

  it("usa un texto por defecto si no se puede leer el campo", () => {
    const pendientes = extraerPendientes([
      { titulo: "HECHOS", contenido: "[PENDIENTE]" },
    ]);

    assert.equal(pendientes[0].pendientes[0], "dato sin especificar");
  });
});

describe("serialización de la base de datos", () => {
  it("convierte las secciones guardadas", () => {
    const secciones = parseSecciones(
      JSON.stringify([{ titulo: "HECHOS", contenido: "…" }])
    );

    assert.equal(secciones.length, 1);
    assert.equal(secciones[0].titulo, "HECHOS");
  });

  it("devuelve una lista vacía si el JSON está corrupto", () => {
    assert.deepEqual(parseSecciones("{no es json"), []);
    assert.deepEqual(parseSecciones("{\"a\":1}"), []);
  });

  it("convierte los antecedentes guardados", () => {
    const antecedentes = parseAntecedentes(
      JSON.stringify({ tipoProcedimiento: "hurto" })
    );

    assert.equal(antecedentes.tipoProcedimiento, "hurto");
    assert.deepEqual(parseAntecedentes("no es json"), {});
  });
});

describe("parseo de la respuesta del modelo", () => {
  it("lee un JSON directo", () => {
    assert.deepEqual(parseModelContent('{"a":1}'), { a: 1 });
  });

  it("extrae el JSON de un texto con Markdown", () => {
    assert.deepEqual(parseModelContent('```json\n{"a":1}\n```'), { a: 1 });
  });

  it("lanza un error si no hay JSON", () => {
    assert.throws(() => parseModelContent("no hay json aquí"));
  });
});
