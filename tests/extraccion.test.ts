import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { esquemaAntecedentes, esquemaBorrador, esquemaRespuestaModelo } from "@/lib/schemas";
import { camposFaltantes, puedeRedactarBorrador } from "@/lib/antecedentes";
import { normalizarFecha } from "@/lib/fecha";
import type { Antecedentes } from "@/lib/types";

/**
 * Pruebas de la capa de extracción de antecedentes.
 * Verifican la normalización de la salida del modelo y las reglas de
 * dominio (no inventar datos, no mezclar procedimientos).
 */

describe("esquema de antecedentes", () => {
  it("convierte los valores vacíos en null", () => {
    const resultado = esquemaAntecedentes.parse({
      tipoProcedimiento: "pendiente",
      especie: "  ",
      lugar: "sin información",
      fecha: "N/A",
      descripcionHechos: null,
      contradicciones: [],
    });

    assert.equal(resultado.tipoProcedimiento, null);
    assert.equal(resultado.especie, null);
    assert.equal(resultado.lugar, null);
    assert.equal(resultado.fecha, null);
    assert.equal(resultado.descripcionHechos, null);
  });

  it("normaliza la fecha a dd/mm/yyyy", () => {
    const resultado = esquemaAntecedentes.parse({ fecha: "2026-06-12" });
    assert.equal(resultado.fecha, "12/06/2026");
  });

  it("deja la fecha en null si no es interpretable", () => {
    const resultado = esquemaAntecedentes.parse({ fecha: "el martes pasado" });
    assert.equal(resultado.fecha, null);
  });

  it("transforma los números en texto", () => {
    const resultado = esquemaAntecedentes.parse({ especie: 42 });
    assert.equal(resultado.especie, "42");
  });

  it("limpia la lista de contradicciones", () => {
    const resultado = esquemaAntecedentes.parse({
      contradicciones: ["  primera  ", "", "segunda", 5 as unknown as string],
    });

    assert.deepEqual(resultado.contradicciones, ["primera", "segunda"]);
  });

  it("usa una lista vacía si contradicciones no es una lista", () => {
    const resultado = esquemaAntecedentes.parse({
      contradicciones: "no es una lista",
    });

    assert.deepEqual(resultado.contradicciones, []);
  });
});

describe("esquema de respuesta del modelo", () => {
  it("detecta el cambio de procedimiento", () => {
    const resultado = esquemaRespuestaModelo.parse({
      tipoProcedimiento: "robo",
      cambioDeProcedimiento: true,
    });

    assert.equal(resultado.cambioDeProcedimiento, true);
  });

  it("asume que no hay cambio cuando el modelo omite el campo", () => {
    const resultado = esquemaRespuestaModelo.parse({
      tipoProcedimiento: "hurto",
    });

    assert.equal(resultado.cambioDeProcedimiento, false);
  });
});

describe("reglas de dominio", () => {
  const completo: Antecedentes = {
    tipoProcedimiento: "hurto",
    especie: "bicicleta",
    lugar: "Plaza de Armas",
    fecha: "12/06/2026",
    descripcionHechos: "El afectado informó el hurto de una bicicleta.",
    contradicciones: [],
  };

  it("no reporta faltantes cuando todo está informado", () => {
    assert.deepEqual(camposFaltantes(completo), []);
  });

  it("enumera los campos obligatorios que faltan", () => {
    const faltantes = camposFaltantes({ ...completo, lugar: null, fecha: null });

    assert.deepEqual(faltantes, ["el lugar de ocurrencia", "la fecha del procedimiento"]);
  });

  it("permite redactar cuando están todos los campos", () => {
    assert.equal(puedeRedactarBorrador(completo), true);
  });

  it("bloquea la redacción si hay contradicciones", () => {
    assert.equal(
      puedeRedactarBorrador({
        ...completo,
        contradicciones: ["El lugar no coincide entre los mensajes."],
      }),
      false
    );
  });

  it("bloquea la redacción si falta un campo obligatorio", () => {
    assert.equal(puedeRedactarBorrador({ ...completo, especie: null }), false);
  });
});

describe("normalización de fechas", () => {
  it("acepta dd/mm/yyyy, dd-mm-yyyy y dd.mm.yyyy", () => {
    assert.equal(normalizarFecha("12/06/2026"), "12/06/2026");
    assert.equal(normalizarFecha("12-06-2026"), "12/06/2026");
    assert.equal(normalizarFecha("12.06.2026"), "12/06/2026");
  });

  it("acepta fechas textuales", () => {
    assert.equal(normalizarFecha("12 de junio de 2026"), "12/06/2026");
    assert.equal(normalizarFecha("1 de enero del 2026"), "01/01/2026");
  });

  it("rechaza fechas imposibles", () => {
    assert.equal(normalizarFecha("31/02/2026"), null);
    assert.equal(normalizarFecha("00/01/2026"), null);
    assert.equal(normalizarFecha("12/13/2026"), null);
  });

  it("acepta el 29 de febrero en años bisiestos", () => {
    assert.equal(normalizarFecha("29/02/2024"), "29/02/2024");
    assert.equal(normalizarFecha("29/02/2026"), null);
  });
});

describe("esquema del borrador", () => {
  it("acepta las secciones del parte", () => {
    const resultado = esquemaBorrador.parse({
      secciones: [
        { titulo: "ANTECEDENTES", contenido: "…" },
        { titulo: "HECHOS", contenido: "…" },
      ],
    });

    assert.equal(resultado.secciones.length, 2);
    assert.equal(resultado.secciones[0].titulo, "ANTECEDENTES");
  });

  it("rechaza una respuesta sin secciones", () => {
    assert.equal(esquemaBorrador.safeParse({}).success, false);
  });
});
