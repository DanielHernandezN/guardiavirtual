import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { esquemaAntecedentes, esquemaBorrador, esquemaRespuestaModelo } from "@/lib/schemas";
import {
  camposFaltantes,
  combinarDatos,
  crearAntecedentesVacios,
  DETENIDO_VACIO,
  esDetencion,
  puedeRedactarBorrador,
} from "@/lib/antecedentes";
import {
  fechaDeHoy,
  fechaYHoraDeHoy,
  normalizarFecha,
  normalizarHora,
} from "@/lib/fecha";
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
    ...crearAntecedentesVacios(),
    tipoProcedimiento: "hurto",
    especie: "bicicleta",
    lugar: "Plaza de Armas",
    fecha: "12/06/2026",
    descripcionHechos: "El afectado informó el hurto de una bicicleta.",
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

describe("esquema de detención", () => {
  it("normaliza los datos del detenido y de la detención", () => {
    const resultado = esquemaAntecedentes.parse({
      detenido: {
        nombre: "Daniel Antonio Hernández Norambuena",
        rut: "18.198.906-8",
        edad: 33,
        fechaNacimiento: "1992-12-07",
      },
      detencion: {
        hora: "15:30 hrs",
        fechaDetencion: "22/10/2026",
        personalAprehensor: "Sgto. 1ro. Daniel Hernández Norambuena",
        lesiones: "sin lesiones",
      },
    });

    assert.equal(resultado.detenido.nombre, "Daniel Antonio Hernández Norambuena");
    assert.equal(resultado.detenido.edad, "33");
    assert.equal(resultado.detenido.fechaNacimiento, "07/12/1992");
    assert.equal(resultado.detenido.telefono, null);
    assert.equal(resultado.detencion.hora, "15:30");
    assert.equal(resultado.detencion.fechaDetencion, "22/10/2026");
    assert.equal(resultado.detencion.vehiculo, null);
    assert.equal(resultado.detencion.lesiones, "sin lesiones");
  });

  it("deja los datos del detenido en null si no hay detención", () => {
    const resultado = esquemaAntecedentes.parse({ tipoProcedimiento: "hurto" });

    assert.deepEqual(resultado.detenido, DETENIDO_VACIO);
    assert.equal(resultado.detencion.hora, null);
    assert.equal(resultado.detencion.personalAprehensor, null);
    assert.equal(resultado.detencion.lesiones, null);
  });

  it("tolera objetos con un tipo inesperado", () => {
    const resultado = esquemaAntecedentes.parse({
      detenido: "no es un objeto",
      detencion: [],
    });

    assert.deepEqual(resultado.detenido, DETENIDO_VACIO);
    assert.equal(resultado.detencion.delito, null);
  });
});

describe("detección de detención", () => {
  it("detecta la detención por los datos del detenido", () => {
    const datos = {
      ...crearAntecedentesVacios(),
      detenido: { ...DETENIDO_VACIO, nombre: "Daniel" },
    };

    assert.equal(esDetencion(datos), true);
  });

  it("detecta la detención por el tipo de procedimiento", () => {
    assert.equal(
      esDetencion({
        ...crearAntecedentesVacios(),
        tipoProcedimiento: "detención",
      }),
      true
    );
    assert.equal(
      esDetencion({
        ...crearAntecedentesVacios(),
        tipoProcedimiento: "hurto",
      }),
      false
    );
  });
});

describe("combinar datos acumulados", () => {
  it("conserva los valores previos cuando el nuevo es null", () => {
    const resultado = combinarDatos(
      { ...DETENIDO_VACIO, nombre: null, rut: "18.198.906-8" },
      { ...DETENIDO_VACIO, nombre: "Daniel", rut: null }
    );

    assert.equal(resultado.nombre, "Daniel");
    assert.equal(resultado.rut, "18.198.906-8");
  });

  it("reemplaza el valor cuando el nuevo está informado", () => {
    const resultado = combinarDatos(
      { ...DETENIDO_VACIO, nombre: "Otro nombre" },
      { ...DETENIDO_VACIO, nombre: "Daniel" }
    );

    assert.equal(resultado.nombre, "Otro nombre");
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

describe("normalización de horas", () => {
  it("acepta el formato de 24 y de 12 horas", () => {
    assert.equal(normalizarHora("15:30"), "15:30");
    assert.equal(normalizarHora("9:05"), "09:05");
    assert.equal(normalizarHora("15.30"), "15:30");
    assert.equal(normalizarHora("15:30 hrs"), "15:30");
    assert.equal(normalizarHora("3:30 pm"), "15:30");
    assert.equal(normalizarHora("12:00 am"), "00:00");
  });

  it("rechaza horas imposibles o no interpretables", () => {
    assert.equal(normalizarHora("25:00"), null);
    assert.equal(normalizarHora("12:75"), null);
    assert.equal(normalizarHora("mediodía"), null);
    assert.equal(normalizarHora(null), null);
  });
});

describe("fecha de hoy", () => {
  it("devuelve la fecha en formato dd/mm/yyyy", () => {
    const hoy = fechaDeHoy(new Date("2026-10-22T15:00:00Z"));

    assert.match(hoy, /^\d{2}\/\d{2}\/\d{4}$/);
    assert.equal(hoy, "22/10/2026");
  });

  it("devuelve la fecha y la hora en formato chileno", () => {
    const { fecha, hora } = fechaYHoraDeHoy(new Date("2026-10-22T15:00:00Z"));

    assert.equal(fecha, "22/10/2026");
    assert.equal(hora, "12:00");
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
