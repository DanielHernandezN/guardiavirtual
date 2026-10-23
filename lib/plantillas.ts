/**
 * Plantillas del parte policial — Guardia Virtual
 * ───────────────────────────────────────────────
 * Estructura formal del documento y títulos según el tipo de procedimiento.
 * El título y las secciones se resuelven en el servidor (determinístico) para
 * que el formato sea consistente; el modelo solo redacta el contenido de cada
 * sección.
 *
 * Hay dos plantillas:
 * - Parte general (hurto, robo, accidente, denuncia, etc.).
 * - Parte de detenido (cuando hay una persona detenida), con identificación
 *   del detenido, circunstancias de la detención y diligencias.
 *
 * Además, todo parte lleva un encabezado fijo (Unidad, N.° de parte, fecha,
 * funcionario y materia) que también se resuelve en el servidor.
 */

import type { SeccionBorrador } from "./types";

/** Título interno de la sección que contiene el encabezado del documento. */
export const TITULO_ENCABEZADO = "ENCABEZADO";

/** Título interno de la sección que contiene el cierre y la firma. */
export const TITULO_PIE = "CIERRE Y FIRMA";

/** Sección de la plantilla: título visible + indicación para el modelo. */
export type SeccionPlantilla = {
  titulo: string;
  /** Qué debe contener la sección (se envía al modelo al redactar). */
  instruccion: string;
};

/** Secciones del parte general, en orden. */
export const SECCIONES_PARTE: readonly SeccionPlantilla[] = [
  {
    titulo: "ANTECEDENTES",
    instruccion:
      "Datos objetivos del procedimiento: tipo de procedimiento, fecha, lugar y especie involucrada. Sin narración de hechos.",
  },
  {
    titulo: "HECHOS",
    instruccion:
      "Relato cronológico y objetivo de lo ocurrido, en tercera persona y en pasado. Cada párrafo debe comenzar con «Que, ».",
  },
  {
    titulo: "ESPECIES INVOLUCRADAS",
    instruccion:
      "Descripción de la especie sustraída, recuperada o incautada, con la información disponible: tipo, marca, modelo, color y número de serie o IMEI si consta.",
  },
  {
    titulo: "CONCLUSIÓN",
    instruccion:
      "Diligencias practicadas y situación final del procedimiento. Solo lo que consta en los antecedentes.",
  },
];

/** Secciones del parte de detenido, en orden. */
export const SECCIONES_DETENIDO: readonly SeccionPlantilla[] = [
  {
    titulo: "IDENTIFICACIÓN DEL DETENIDO",
    instruccion:
      "Un dato por línea con el formato «Etiqueta: valor»: nombre completo, RUT, edad, nacionalidad, estado civil, nivel de estudios, ocupación, fecha de nacimiento, domicilio, teléfono y correo electrónico.",
  },
  {
    titulo: "CIRCUNSTANCIAS DE LA DETENCIÓN",
    instruccion:
      "Un dato por línea con el formato «Etiqueta: valor»: fecha y hora de la detención, delito, lugar exacto, personal aprehensor, personal acompañante y vehículo policial.",
  },
  {
    titulo: "HECHOS",
    instruccion:
      "Relato cronológico, en tercera persona y en pasado, de cómo se produjo la detención: patrullaje o diligencia, advertencia de testigos, descripción del sujeto, interceptación, uso de la fuerza si corresponde y detención. Cada párrafo debe comenzar con «Que, ».",
  },
  {
    titulo: "ESPECIES INVOLUCRADAS",
    instruccion:
      "Descripción de la especie sustraída, recuperada, entregada o incautada, con la información disponible: tipo, marca, modelo, color y número de serie o IMEI si consta.",
  },
  {
    titulo: "DERECHOS Y TRASLADO",
    instruccion:
      "Diligencias posteriores a la detención, en el orden en que ocurrieron: lectura de derechos, esposamiento, ingreso al calabozo del vehículo, constatación de lesiones y traslado a la unidad policial. Solo si constan en los antecedentes.",
  },
];

/** Devuelve las secciones que corresponden al tipo de parte. */
export const seccionesPara = (
  detencion: boolean
): readonly SeccionPlantilla[] =>
  detencion ? SECCIONES_DETENIDO : SECCIONES_PARTE;

/** Datos que alimentan el encabezado fijo del parte. */
export type DatosEncabezadoParte = {
  /** Nombre de la unidad (por ejemplo, "1ra. Comisaría Villarrica"). */
  unidad: string | null;
  /** Número o folio del parte, si se conoce. */
  numeroParte?: string | null;
  /** Fecha de confección en formato `dd/mm/yyyy`. */
  fecha: string;
  /** Hora de confección en formato `HH:mm`. */
  hora: string;
  /** Funcionario que confecciona el parte. */
  funcionario: string;
  /** Delito o procedimiento que motiva el parte. */
  materia: string | null;
};

/**
 * Construye el encabezado del parte con los datos disponibles.
 * Los datos que falten se marcan como `[PENDIENTE]` para que el funcionario
 * los complete antes de confirmar el documento.
 */
export const construirEncabezadoParte = (
  datos: DatosEncabezadoParte
): string =>
  [
    `UNIDAD: ${datos.unidad?.trim() || "[PENDIENTE]"}`,
    `PARTE NRO.: ${datos.numeroParte?.trim() || "[PENDIENTE]"}`,
    `FECHA: ${datos.fecha}   HORA: ${datos.hora}`,
    `FUNCIONARIO: ${datos.funcionario}`,
    `MATERIA: ${datos.materia?.trim() || "[PENDIENTE]"}`,
  ].join("\n");

/**
 * Construye el cierre del parte con la fórmula de estilo y la firma.
 * El funcionario puede ajustar el texto en el visor antes de confirmar.
 */
export const construirPieParte = (datos: {
  funcionario: string;
  unidad?: string | null;
}): string =>
  [
    "Es cuanto puedo informar a Ud.",
    "",
    "_______________________________",
    datos.funcionario,
    datos.unidad?.trim() || "Funcionario",
  ].join("\n");

/**
 * Compone el texto plano del parte: encabezado, título y secciones.
 * El encabezado se coloca primero, como en el documento impreso.
 */
export const componerTextoParte = (
  titulo: string,
  secciones: readonly SeccionBorrador[]
): string => {
  const encabezado = secciones.find(
    (seccion) => seccion.titulo === TITULO_ENCABEZADO
  );
  const cuerpo = secciones.filter(
    (seccion) => seccion.titulo !== TITULO_ENCABEZADO
  );

  return [
    encabezado?.contenido,
    titulo,
    ...cuerpo.map((seccion) => `${seccion.titulo}\n${seccion.contenido}`),
  ]
    .filter((bloque): bloque is string => Boolean(bloque))
    .join("\n\n");
};

/** Títulos del parte según el tipo de procedimiento. */
const TITULOS_POR_TIPO: Record<string, string> = {
  hurto: "PARTE DE HURTO",
  robo: "PARTE DE ROBO",
  "robo con violencia": "PARTE DE ROBO CON VIOLENCIA",
  "robo con intimidacion": "PARTE DE ROBO CON INTIMIDACIÓN",
  "robo por sorpresa": "PARTE DE ROBO POR SORPRESA",
  "robo de vehiculo": "PARTE DE ROBO DE VEHÍCULO",
  accidente: "PARTE DE ACCIDENTE DE TRÁNSITO",
  "accidente de transito": "PARTE DE ACCIDENTE DE TRÁNSITO",
  denuncia: "DENUNCIA",
  infraccion: "PARTE DE INFRACCIÓN",
  infracción: "PARTE DE INFRACCIÓN",
  violencia: "PARTE DE VIOLENCIA INTRAFAMILIAR",
  "violencia intrafamiliar": "PARTE DE VIOLENCIA INTRAFAMILIAR",
  amenazas: "PARTE DE AMENAZAS",
  detencion: "PARTE DE DETENIDO",
  detención: "PARTE DE DETENIDO",
  detenido: "PARTE DE DETENIDO",
  aprehension: "PARTE DE DETENIDO",
  aprehensión: "PARTE DE DETENIDO",
  otro: "PARTE POLICIAL",
};

/**
 * Devuelve el título formal del parte.
 *
 * Cuando el procedimiento incluye una detención, el documento es un
 * «PARTE DE DETENIDO» aunque el delito sea otro (robo, hurto, etc.).
 */
export const tituloPorTipo = (
  tipoProcedimiento: string | null,
  detencion = false
): string => {
  if (detencion) {
    return "PARTE DE DETENIDO";
  }

  if (!tipoProcedimiento) {
    return "PARTE POLICIAL";
  }

  const clave = tipoProcedimiento.toLowerCase().trim();
  return TITULOS_POR_TIPO[clave] ?? "PARTE POLICIAL";
};
