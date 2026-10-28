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
  TITULO_RELATO,
  componerTextoParte,
  construirInstruccionesFiscal,
  construirMembrete,
  construirPieParte,
  seccionesPara,
  tituloPorTipo,
  SECCIONES_PARTE,
  SECCIONES_DETENIDO,
  SECCIONES_VIF,
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
      [
        "RELATO",
        "LESIONES",
        "ESPECIES SUSTRAÍDAS",
        "INCAUTACIÓN",
        "GRABACIONES Y CADENA DE CUSTODIA",
        "DAÑOS",
        "AVALÚO",
        "TESTIGOS",
        "CÁMARAS DE SEGURIDAD",
        "DILIGENCIAS",
      ]
    );
  });

  it("expone las secciones del parte de detenido", () => {
    assert.deepEqual(
      SECCIONES_DETENIDO.map((seccion) => seccion.titulo),
      [
        "RELATO",
        "DERECHOS",
        "LESIONES",
        "VERIFICACIÓN DE IDENTIDAD",
        "ANTECEDENTES",
        "ESPECIES SUSTRAÍDAS",
        "INCAUTACIÓN",
        "DAÑOS",
        "AVALÚO",
        "TESTIGOS",
        "CÁMARAS DE SEGURIDAD",
        "LICENCIAS DE CONDUCTOR",
        "SEGUROS OBLIGATORIOS",
        "SEGUROS COMPLEMENTARIOS",
        "DILIGENCIAS",
      ]
    );
  });

  it("usa la plantilla de violencia intrafamiliar", () => {
    assert.deepEqual(
      SECCIONES_VIF.map((seccion) => seccion.titulo),
      [
        "RELATO",
        "LESIONES",
        "CONSENTIMIENTO SERNAMEG",
        "PAUTA RIESGO",
        "TESTIGOS",
        "CÁMARAS DE SEGURIDAD",
        "IDENTIDAD DEL DENUNCIADO",
        "CONTROL DE ARMAS",
        "DILIGENCIAS",
      ]
    );
  });

  it("elige la plantilla según el tipo de parte", () => {
    assert.equal(seccionesPara(true), SECCIONES_DETENIDO);
    assert.equal(seccionesPara(false), SECCIONES_PARTE);
    assert.equal(
      seccionesPara(false, "violencia intrafamiliar"),
      SECCIONES_VIF
    );
    assert.equal(seccionesPara(true, "VIF"), SECCIONES_VIF);
  });
});

describe("membrete del parte", () => {
  it("arma el membrete con prefectura y unidad", () => {
    const membrete = construirMembrete({
      prefectura: "Prefectura Villarrica Nro. 3",
      unidad: "9na. Comisaría Pucón",
    });

    assert.equal(
      membrete,
      "CARABINEROS DE CHILE\nPREFECTURA VILLARRICA NRO. 3\n9NA. COMISARÍA PUCÓN"
    );
  });

  it("omite el membrete si no hay datos de la unidad", () => {
    assert.equal(construirMembrete({}), "");
    assert.equal(construirMembrete({ prefectura: null, unidad: "  " }), "");
  });

  it("compone el texto con membrete, relato y secciones sin título", () => {
    const texto = componerTextoParte("PARTE DE DETENIDO", [
      { titulo: TITULO_ENCABEZADO, contenido: "CARABINEROS DE CHILE" },
      { titulo: TITULO_RELATO, contenido: "Doy cuenta a esa Fiscalía Local." },
      { titulo: "LESIONES", contenido: "Sin lesiones." },
      { titulo: TITULO_PIE, contenido: "Firmas" },
    ]);

    assert.ok(texto.startsWith("CARABINEROS DE CHILE"));
    assert.ok(!texto.includes("PARTE DE DETENIDO"));
    assert.ok(!texto.includes(`${TITULO_RELATO}:`));
    assert.match(texto, /LESIONES: Sin lesiones\./);
    assert.ok(texto.indexOf("LESIONES") < texto.indexOf("Firmas"));
    assert.ok(!texto.includes(TITULO_ENCABEZADO));
  });
});

describe("instrucciones del fiscal", () => {
  it("numera las instrucciones y menciona el folio", () => {
    const instrucciones = construirInstruccionesFiscal({
      nombre: "Fiscal de Turno",
      folio: "2026-4-44151",
      instrucciones: [
        "Concurrencia personal SIAT",
        "Constatar lesiones de la víctima",
      ],
    });

    assert.ok(instrucciones);
    assert.match(instrucciones, /folio N° 2026-4-44151/);
    assert.match(instrucciones, /1\. Concurrencia personal SIAT/);
    assert.match(instrucciones, /2\. Constatar lesiones de la víctima/);
  });

  it("devuelve null si no hay datos del fiscal", () => {
    assert.equal(
      construirInstruccionesFiscal({
        nombre: null,
        folio: null,
        instrucciones: [],
      }),
      null
    );
  });
});

describe("cierre y firma del parte", () => {
  it("incluye una línea de firma por funcionario", () => {
    const pie = construirPieParte([
      { grado: "Sargento 2do.", nombre: "Daniel Hernández Norambuena" },
      { grado: "Cabo 1ro.", nombre: "Leonardo Cariman Huenhupi" },
    ]);

    assert.match(
      pie,
      /DATOS DE LOS FUNCIONARIOS A CARGO DEL PROCEDIMIENTO\./
    );
    assert.match(pie, /Sargento 2do\. Daniel Hernández Norambuena\s+_+/);
    assert.match(pie, /Cabo 1ro\. Leonardo Cariman Huenhupi\s+_+/);
    assert.ok(!pie.includes("Es cuanto puedo informar"));
  });

  it("devuelve una cadena vacía si no hay funcionarios", () => {
    assert.equal(construirPieParte([]), "");
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
