import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extraerPendientes,
  parseAntecedentes,
  parseSecciones,
  tituloDeCaso,
} from "@/lib/casos";
import {
  TITULO_ENCABEZADO,
  TITULO_PIE,
  componerTextoParte,
  construirEncabezadoParte,
  construirPieParte,
  seccionesPara,
  tituloPorTipo,
  SECCIONES_PARTE,
  SECCIONES_DETENIDO,
} from "@/lib/plantillas";
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

  it("usa el delito cuando es una detención", () => {
    assert.equal(
      tituloDeCaso({
        tipoProcedimiento: "detencion",
        especie: "celular",
        detencion: { delito: "Robo por Sorpresa" },
      }),
      "Detención por robo por sorpresa"
    );
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

  it("usa el título de detenido cuando hay una detención", () => {
    assert.equal(tituloPorTipo("robo por sorpresa", true), "PARTE DE DETENIDO");
    assert.equal(tituloPorTipo(null, true), "PARTE DE DETENIDO");
    assert.equal(tituloPorTipo("detención"), "PARTE DE DETENIDO");
  });

  it("expone las secciones oficiales del parte", () => {
    assert.deepEqual(
      SECCIONES_PARTE.map((seccion) => seccion.titulo),
      ["ANTECEDENTES", "HECHOS", "ESPECIES INVOLUCRADAS", "CONCLUSIÓN"]
    );
  });

  it("expone las secciones del parte de detenido", () => {
    assert.deepEqual(
      SECCIONES_DETENIDO.map((seccion) => seccion.titulo),
      [
        "IDENTIFICACIÓN DEL DETENIDO",
        "CIRCUNSTANCIAS DE LA DETENCIÓN",
        "HECHOS",
        "ESPECIES INVOLUCRADAS",
        "DERECHOS Y TRASLADO",
      ]
    );
  });

  it("elige la plantilla según el tipo de parte", () => {
    assert.equal(seccionesPara(true), SECCIONES_DETENIDO);
    assert.equal(seccionesPara(false), SECCIONES_PARTE);
  });
});

describe("encabezado del parte", () => {
  it("arma el encabezado con los datos disponibles", () => {
    const encabezado = construirEncabezadoParte({
      unidad: "1ra. Comisaría Villarrica",
      numeroParte: "1234",
      fecha: "22/10/2026",
      hora: "15:30",
      funcionario: "Daniel Hernández Norambuena",
      materia: "Robo por sorpresa",
    });

    assert.match(encabezado, /UNIDAD: 1ra\. Comisaría Villarrica/);
    assert.match(encabezado, /PARTE NRO\.: 1234/);
    assert.match(encabezado, /FECHA: 22\/10\/2026\s+HORA: 15:30/);
    assert.match(encabezado, /FUNCIONARIO: Daniel Hernández Norambuena/);
    assert.match(encabezado, /MATERIA: Robo por sorpresa/);
  });

  it("marca como pendientes los datos que faltan", () => {
    const encabezado = construirEncabezadoParte({
      unidad: null,
      fecha: "22/10/2026",
      hora: "15:30",
      funcionario: "Funcionario de Prueba",
      materia: null,
    });

    assert.match(encabezado, /UNIDAD: \[PENDIENTE\]/);
    assert.match(encabezado, /PARTE NRO\.: \[PENDIENTE\]/);
    assert.match(encabezado, /MATERIA: \[PENDIENTE\]/);
  });

  it("compone el texto con el encabezado primero y el título después", () => {
    const texto = componerTextoParte("PARTE DE DETENIDO", [
      { titulo: TITULO_ENCABEZADO, contenido: "UNIDAD: Prueba" },
      { titulo: "HECHOS", contenido: "Que, ocurrió el hecho." },
      { titulo: TITULO_PIE, contenido: "Es cuanto puedo informar a Ud." },
    ]);

    assert.ok(texto.startsWith("UNIDAD: Prueba"));
    assert.ok(texto.indexOf("PARTE DE DETENIDO") < texto.indexOf("HECHOS"));
    assert.ok(texto.indexOf("HECHOS") < texto.indexOf("Es cuanto puedo informar"));
    assert.ok(!texto.includes(TITULO_ENCABEZADO));
  });
});

describe("cierre y firma del parte", () => {
  it("incluye la fórmula de cierre y el nombre del funcionario", () => {
    const pie = construirPieParte({
      funcionario: "Daniel Hernández Norambuena",
      unidad: "1ra. Comisaría Villarrica",
    });

    assert.match(pie, /Es cuanto puedo informar a Ud\./);
    assert.match(pie, /Daniel Hernández Norambuena/);
    assert.match(pie, /1ra\. Comisaría Villarrica/);
  });

  it("usa 'Funcionario' si no hay unidad", () => {
    const pie = construirPieParte({
      funcionario: "Funcionario de Prueba",
      unidad: null,
    });

    assert.match(pie, /Funcionario de Prueba\nFuncionario$/);
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
