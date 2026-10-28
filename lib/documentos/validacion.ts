import { esDetencion } from "../antecedentes";
import type { Antecedentes } from "../types";
import type { DefinicionPlantilla, Observacion } from "./tipos";

/**
 * Validación de antecedentes — Guardia Virtual
 * ────────────────────────────────────────────
 * Comprobaciones determinísticas antes de redactar. No corrige ni completa
 * datos: solo registra observaciones para que el funcionario revise.
 *
 * La confianza del modelo no se usa como garantía: aquí se valida el formato,
 * la coherencia entre campos y la presencia de resultados informados.
 */

/** Etiquetas legibles de los campos que se informan al funcionario. */
export const ETIQUETAS_CAMPO: Readonly<Record<string, string>> = {
  tipoProcedimiento: "el tipo de procedimiento",
  lugar: "el lugar de ocurrencia",
  fecha: "la fecha del procedimiento",
  descripcionHechos: "el relato de los hechos",
  especie: "la especie involucrada",
  detalleEspecies: "el detalle de las especies",
  "detenido.nombre": "el nombre del detenido",
  "detenido.rut": "el RUT del detenido",
  "detenido.edad": "la edad del detenido",
  "detenido.fechaNacimiento": "la fecha de nacimiento del detenido",
  "detenido.domicilio": "el domicilio del detenido",
  "detencion.hora": "la hora de la detención",
  "detencion.delito": "el delito o motivo de la detención",
  "detencion.personalAprehensor": "el personal aprehensor",
  "detencion.lesiones": "la constatación de lesiones",
  "detencion.situacion": "la situación del detenido",
  "pruebas.alcoholemia": "el resultado de la alcoholemia",
  "pruebas.respiratoria": "el resultado de la prueba respiratoria",
  vehiculos: "los vehículos involucrados",
  testigos: "los testigos",
  camaras: "la información de cámaras",
  diligencias: "las diligencias",
  "fiscal.instrucciones": "las instrucciones del fiscal",
};

/** Quita puntos, guiones y espacios del RUT y lo deja en mayúsculas. */
export const limpiarRut = (rut: string): string =>
  rut.replace(/[.\-\s]/g, "").toUpperCase();

/**
 * Valida un RUT chileno con su dígito verificador (módulo 11).
 * Es una comprobación de formato: no acredita la identidad de la persona.
 */
export const validarRut = (rut: string | null): boolean => {
  if (!rut) return false;

  const limpio = limpiarRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;

  const cuerpo = limpio.slice(0, -1);
  const digito = limpio.slice(-1);

  let suma = 0;
  let multiplicador = 2;

  for (let indice = cuerpo.length - 1; indice >= 0; indice--) {
    suma += Number(cuerpo[indice]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);

  return digito === esperado;
};

/**
 * Valida el formato de una patente chilena: cuatro letras y dos dígitos
 * (nuevo formato), dos letras y cuatro dígitos (antiguo) o dos letras, tres
 * dígitos y una letra (motos).
 */
export const validarPatente = (patente: string | null): boolean => {
  if (!patente) return false;

  const limpia = patente.replace(/[.\-\s]/g, "").toUpperCase();
  return /^[A-Z]{4}\d{2}$/.test(limpia) || /^[A-Z]{2}\d{4}$/.test(limpia);
};

/** Normaliza un nombre para comparar (minúsculas y sin tildes). */
const normalizarNombre = (nombre: string): string =>
  nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Convierte `dd/mm/yyyy` en fecha UTC, o `null` si no es válida. */
const fechaDesdeTexto = (texto: string | null): Date | null => {
  if (!texto) return null;

  const partes = texto.split("/").map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null;

  const [dia, mes, anio] = partes;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return fecha.getUTCDate() === dia && fecha.getUTCMonth() === mes - 1
    ? fecha
    : null;
};

/** Años cumplidos entre dos fechas. */
const aniosCumplidos = (nacimiento: Date, referencia: Date): number => {
  let anios = referencia.getUTCFullYear() - nacimiento.getUTCFullYear();
  const antesDeCumplir =
    referencia.getUTCMonth() < nacimiento.getUTCMonth() ||
    (referencia.getUTCMonth() === nacimiento.getUTCMonth() &&
      referencia.getUTCDate() < nacimiento.getUTCDate());

  if (antesDeCumplir) anios--;
  return anios;
};

/** Indica si un valor de antecedente está vacío. */
export const valorVacio = (valor: unknown): boolean => {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === "string") return valor.trim().length === 0;
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
};

const leerSegmentos = (actual: unknown, segmentos: string[]): unknown => {
  if (segmentos.length === 0) return actual ?? null;
  if (actual === null || actual === undefined) return null;

  const [segmento, ...resto] = segmentos;
  const esArreglo = segmento.endsWith("[]");
  const clave = esArreglo ? segmento.slice(0, -2) : segmento;

  if (typeof actual !== "object") return null;

  const valor = (actual as Record<string, unknown>)[clave];

  if (!esArreglo) {
    return leerSegmentos(valor, resto);
  }

  if (!Array.isArray(valor)) return null;
  if (resto.length === 0) return valor;

  const valores = valor
    .map((item) => leerSegmentos(item, resto))
    .filter((item) => !valorVacio(item));

  return valores.length > 0 ? valores : null;
};

/**
 * Lee una ruta de antecedentes, incluidas rutas de arreglo (`vehiculos[].patente`).
 * Devuelve `null` si no existe.
 */
export const leerRuta = (datos: unknown, ruta: string): unknown =>
  leerSegmentos(datos, ruta.split("."));

/** Campos requeridos por la plantilla que no tienen valor. */
export const faltantesDePlantilla = (
  antecedentes: Antecedentes,
  plantilla: DefinicionPlantilla
): string[] =>
  plantilla.camposRequeridos
    .filter((ruta) => valorVacio(leerRuta(antecedentes, ruta)))
    .map((ruta) => ETIQUETAS_CAMPO[ruta] ?? ruta);

/**
 * Valida los antecedentes y devuelve las observaciones detectadas.
 *
 * No modifica los datos: si un valor no se puede interpretar, se informa y se
 * conserva tal cual.
 */
export const validarAntecedentes = (
  antecedentes: Antecedentes,
  opciones: { hoy?: Date } = {}
): Observacion[] => {
  const observaciones: Observacion[] = [];
  const agregar = (
    nivel: Observacion["nivel"],
    campo: string,
    mensaje: string
  ) => observaciones.push({ nivel, campo, mensaje });

  const hoy = opciones.hoy ?? new Date();
  const fechaHecho = fechaDesdeTexto(antecedentes.fecha);
  const nacimiento = fechaDesdeTexto(antecedentes.detenido.fechaNacimiento);

  // Contradicciones detectadas durante la extracción.
  for (const contradiccion of antecedentes.contradicciones) {
    agregar("error", "contradicciones", contradiccion);
  }

  // Fechas.
  if (fechaHecho && fechaHecho.getTime() > hoy.getTime()) {
    agregar(
      "error",
      "fecha",
      "La fecha del procedimiento es posterior a hoy: revisa el dato."
    );
  }

  if (fechaHecho && nacimiento && nacimiento.getTime() > fechaHecho.getTime()) {
    agregar(
      "error",
      "detenido.fechaNacimiento",
      "La fecha de nacimiento es posterior a la fecha del procedimiento."
    );
  }

  // Edad y fecha de nacimiento.
  if (nacimiento && fechaHecho) {
    const edadCalculada = aniosCumplidos(nacimiento, fechaHecho);
    const edadInformada = Number(
      (antecedentes.detenido.edad ?? "").replace(/[^\d]/g, "")
    );

    if (
      Number.isFinite(edadInformada) &&
      edadInformada > 0 &&
      Math.abs(edadInformada - edadCalculada) > 1
    ) {
      agregar(
        "advertencia",
        "detenido.edad",
        `La edad informada (${edadInformada}) no coincide con la fecha de nacimiento (${edadCalculada} años a la fecha del procedimiento).`
      );
    }
  }

  // RUT del detenido y de los testigos.
  if (antecedentes.detenido.rut && !validarRut(antecedentes.detenido.rut)) {
    agregar(
      "advertencia",
      "detenido.rut",
      `El RUT del detenido ("${antecedentes.detenido.rut}") no supera la validación del dígito verificador. Se conserva tal como fue informado.`
    );
  }

  antecedentes.testigos.forEach((testigo, indice) => {
    if (testigo.rut && !validarRut(testigo.rut)) {
      agregar(
        "advertencia",
        `testigos[${indice}].rut`,
        `El RUT del testigo ("${testigo.rut}") no supera la validación del dígito verificador.`
      );
    }
  });

  // Patentes.
  antecedentes.vehiculos.forEach((vehiculo, indice) => {
    if (vehiculo.patente && !validarPatente(vehiculo.patente)) {
      agregar(
        "advertencia",
        `vehiculos[${indice}].patente`,
        `La patente ("${vehiculo.patente}") no tiene un formato chileno reconocible. Se conserva tal como fue informada.`
      );
    }
  });

  // Posible confusión entre el detenido y el personal aprehensor.
  const nombreDetenido = antecedentes.detenido.nombre
    ? normalizarNombre(antecedentes.detenido.nombre)
    : null;

  for (const [campo, valor] of [
    ["detencion.personalAprehensor", antecedentes.detencion.personalAprehensor],
    ["detencion.personalAcompanante", antecedentes.detencion.personalAcompanante],
  ] as const) {
    if (
      nombreDetenido &&
      valor &&
      normalizarNombre(valor).includes(nombreDetenido)
    ) {
      agregar(
        "advertencia",
        campo,
        "El nombre del detenido aparece también en el personal interviniente: confirma que no se hayan confundido las personas."
      );
    }
  }

  // Detención.
  if (esDetencion(antecedentes)) {
    if (!antecedentes.detencion.hora) {
      agregar(
        "advertencia",
        "detencion.hora",
        "No consta la hora de la detención; el relato la mencionará como «una hora no informada»."
      );
    }

    if (!antecedentes.detencion.lesiones) {
      agregar(
        "info",
        "detencion.lesiones",
        "No consta la constatación de lesiones del detenido."
      );
    }

    const esEbriedad = /ebriedad|alcohol|alcoholemia|conducci[oó]n/i.test(
      [
        antecedentes.tipoProcedimiento,
        antecedentes.detencion.delito,
        antecedentes.descripcionHechos,
      ]
        .filter(Boolean)
        .join(" ")
    );

    if (
      esEbriedad &&
      !antecedentes.pruebas.alcoholemia &&
      !antecedentes.pruebas.respiratoria
    ) {
      agregar(
        "advertencia",
        "pruebas.alcoholemia",
        "El procedimiento menciona ebriedad pero no consta el resultado de la alcoholemia ni de la prueba respiratoria. No se deduce ni se completa: queda pendiente de informar."
      );
    }
  }

  // Relato.
  if (
    antecedentes.descripcionHechos &&
    antecedentes.descripcionHechos.trim().length < 40
  ) {
    agregar(
      "advertencia",
      "descripcionHechos",
      "El relato es muy breve: revisa que describa las circunstancias del procedimiento."
    );
  }

  return observaciones;
};
