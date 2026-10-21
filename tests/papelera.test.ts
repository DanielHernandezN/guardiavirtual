import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { toCasoResumen } from "@/lib/casos";
import { tituloDeCaso } from "@/lib/casos";

/**
 * Pruebas de la serialización de casos, incluida la papelera.
 */

const filaBase = {
  id: "caso-1",
  titulo: "Hurto de bicicleta",
  tipoProcedimiento: "hurto",
  especie: "bicicleta",
  lugar: "Plaza de Armas",
  fecha: "12/06/2026",
  estado: "BORRADOR",
  createdAt: new Date("2026-06-12T10:00:00.000Z"),
  updatedAt: new Date("2026-06-12T10:00:00.000Z"),
  antecedentes: JSON.stringify({ tipoProcedimiento: "hurto" }),
  eliminadoEn: null as Date | null,
  borradores: [],
};

describe("serialización de casos", () => {
  it("marca el caso como activo cuando no está eliminado", () => {
    const resumen = toCasoResumen(filaBase);

    assert.equal(resumen.enPapelera, false);
    assert.equal(resumen.titulo, "Hurto de bicicleta");
    assert.equal(resumen.antecedentes.tipoProcedimiento, "hurto");
  });

  it("marca el caso como eliminado cuando tiene fecha de eliminación", () => {
    const resumen = toCasoResumen({
      ...filaBase,
      eliminadoEn: new Date("2026-06-13T09:00:00.000Z"),
    });

    assert.equal(resumen.enPapelera, true);
  });

  it("convierte las fechas a ISO", () => {
    const resumen = toCasoResumen(filaBase);

    assert.equal(resumen.creadoEn, "2026-06-12T10:00:00.000Z");
    assert.equal(resumen.actualizadoEn, "2026-06-12T10:00:00.000Z");
  });

  it("devuelve el historial de borradores", () => {
    const resumen = toCasoResumen({
      ...filaBase,
      borradores: [
        {
          id: "borrador-1",
          titulo: "PARTE DE HURTO",
          texto: "PARTE DE HURTO",
          secciones: JSON.stringify([{ titulo: "HECHOS", contenido: "…" }]),
          estado: "BORRADOR",
          generadoEn: new Date("2026-06-12T10:05:00.000Z"),
          confirmadoEn: null,
        },
      ],
    });

    assert.equal(resumen.borradores.length, 1);
    assert.equal(resumen.borradores[0].secciones[0].titulo, "HECHOS");
    assert.equal(resumen.borradores[0].confirmadoEn, null);
  });
});

describe("título del caso", () => {
  it("usa el tipo y la especie", () => {
    assert.equal(
      tituloDeCaso({ tipoProcedimiento: "robo", especie: "celular" }),
      "Robo de celular"
    );
  });
});
