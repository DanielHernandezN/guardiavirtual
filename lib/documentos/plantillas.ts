import {
  SECCIONES_DETENIDO,
  SECCIONES_PARTE,
  SECCIONES_VIF,
  TITULO_INSTRUCCIONES,
  TITULO_RELATO,
  TITULO_SITUACION,
  esViolenciaIntrafamiliar,
} from "../plantillas";
import { esDetencion } from "../antecedentes";
import type { Antecedentes } from "../types";
import type { DefinicionPlantilla, FormatoDocumento } from "./tipos";

/**
 * Plantillas de destino — Guardia Virtual
 * ──────────────────────────────────────
 * Definiciones explícitas y versionadas. La estructura y el orden de las
 * secciones viven en código; el modelo solo redacta el contenido.
 *
 * Extiende `lib/plantillas.ts` (secciones oficiales de la unidad) en lugar de
 * crear un mecanismo paralelo.
 */

const FORMATO_INSTITUCIONAL: FormatoDocumento = {
  fuente: "Arial",
  tamanoPuntos: 11,
  interlineado: 1.5,
  margenesCm: { superior: 2.5, inferior: 2.5, izquierdo: 3, derecho: 2 },
  justificado: true,
};

/** Trazabilidad de destino común a todas las plantillas. */
const MAPEO_COMUN: Readonly<Record<string, string>> = {
  tipoProcedimiento: TITULO_RELATO,
  fecha: TITULO_RELATO,
  lugar: TITULO_RELATO,
  descripcionHechos: TITULO_RELATO,
  "detenido.nombre": TITULO_RELATO,
  "detenido.rut": TITULO_RELATO,
  "detenido.edad": TITULO_RELATO,
  "detenido.nacionalidad": TITULO_RELATO,
  "detenido.estadoCivil": TITULO_RELATO,
  "detenido.estudios": TITULO_RELATO,
  "detenido.ocupacion": TITULO_RELATO,
  "detenido.fechaNacimiento": TITULO_RELATO,
  "detenido.domicilio": TITULO_RELATO,
  "detenido.telefono": TITULO_RELATO,
  "detenido.correo": TITULO_RELATO,
  "detencion.hora": TITULO_RELATO,
  "detencion.fechaDetencion": TITULO_RELATO,
  "detencion.delito": TITULO_RELATO,
  "detencion.lugarDetencion": TITULO_RELATO,
  "detencion.personalAprehensor": TITULO_RELATO,
  "detencion.personalAcompanante": TITULO_RELATO,
  "detencion.vehiculo": TITULO_RELATO,
  funcionarios: TITULO_RELATO,
  "funcionarios[].grado": TITULO_RELATO,
  "funcionarios[].nombre": TITULO_RELATO,
  "detencion.lesiones": "LESIONES",
  "detencion.situacion": TITULO_SITUACION,
  "pruebas.alcoholemia": "PRUEBAS RESPIRATORIAS Y ALCOHOLEMIA",
  "pruebas.respiratoria": "PRUEBAS RESPIRATORIAS Y ALCOHOLEMIA",
  "pruebas.otras": "PRUEBAS RESPIRATORIAS Y ALCOHOLEMIA",
  especie: "ESPECIES SUSTRAÍDAS",
  detalleEspecies: "ESPECIES SUSTRAÍDAS",
  vehiculos: "VEHÍCULOS",
  "vehiculos[].patente": "VEHÍCULOS",
  "vehiculos[].marca": "VEHÍCULOS",
  "vehiculos[].modelo": "VEHÍCULOS",
  "vehiculos[].color": "VEHÍCULOS",
  "vehiculos[].anio": "VEHÍCULOS",
  "vehiculos[].documentos": "VEHÍCULOS",
  "vehiculos[].seguros": "SEGUROS OBLIGATORIOS",
  "vehiculos[].licencias": "LICENCIAS DE CONDUCTOR",
  "fiscal.nombre": TITULO_INSTRUCCIONES,
  "fiscal.folio": TITULO_INSTRUCCIONES,
  "fiscal.instrucciones": TITULO_INSTRUCCIONES,
  camaras: "CÁMARAS DE SEGURIDAD",
  diligencias: "DILIGENCIAS",
  testigos: "TESTIGOS",
  "testigos[].nombre": "TESTIGOS",
  "testigos[].rut": "TESTIGOS",
  "testigos[].declaracion": "TESTIGOS",
};

const REGLAS_COMUNES = [
  "Usa exclusivamente los antecedentes entregados: no agregues nombres, RUT, patentes, fechas, horas, resultados ni diligencias.",
  "Atribuye las declaraciones a quien las prestó («según lo manifestado por…», «el personal aprehensor señaló que…»); no las presentes como hechos comprobados.",
  "No conviertas hipótesis, sospechas o versiones de terceros en conclusiones.",
  "No ocultes contradicciones ni datos dudosos: si el antecedente está en revisión, redáctalo sin afirmarlo como certeza.",
  "Donde falte un dato indispensable dentro del relato, escribe [PENDIENTE]; nunca lo completes por suposición.",
  "Usa español formal, neutro y en tercera persona, con fechas dd/mm/yyyy y horas HH:mm.",
  "Respeta el orden de secciones de la plantilla y omite las que no tengan datos.",
  "No repitas antecedentes ya tratados en otra sección.",
] as const;

/** Parte de detenido: se usa cuando el procedimiento incluye una detención. */
export const PLANTILLA_DETENIDO: DefinicionPlantilla = {
  id: "parte-detenido",
  nombre: "Parte de detenido",
  version: "1.1.0",
  descripcion:
    "Parte de un procedimiento con detención: relato, derechos, lesiones, pruebas, antecedentes, especies, vehículos, diligencias, situación del detenido e instrucciones del fiscal.",
  secciones: SECCIONES_DETENIDO,
  camposRequeridos: ["tipoProcedimiento", "lugar", "fecha", "descripcionHechos"],
  camposOpcionales: [
    "especie",
    "detalleEspecies",
    "detenido.nombre",
    "detenido.rut",
    "detencion.hora",
    "detencion.delito",
    "detencion.personalAprehensor",
    "detencion.lesiones",
    "detencion.situacion",
    "pruebas.alcoholemia",
    "pruebas.respiratoria",
    "vehiculos",
    "testigos",
    "camaras",
    "diligencias",
    "fiscal.instrucciones",
  ],
  reglasRedaccion: [
    "El primer párrafo abre con «Doy cuenta a esa Fiscalía Local que, el día de hoy …».",
    "Identifica al detenido dentro del relato, en línea corrida, con los datos que consten.",
    "Los derechos, el traslado y las diligencias se mencionan solo si constan en los antecedentes.",
    ...REGLAS_COMUNES,
  ],
  formato: FORMATO_INSTITUCIONAL,
  condicionesBloqueo: [
    "Hay contradicciones entre procedimientos distintos.",
    "Falta el tipo de procedimiento, el lugar, la fecha o el relato de los hechos.",
  ],
  mapeo: MAPEO_COMUN,
};

/** Parte general: hurto, robo, accidente, daños u otros sin detención. */
export const PLANTILLA_PARTE: DefinicionPlantilla = {
  id: "parte-general",
  nombre: "Parte policial general",
  version: "1.1.0",
  descripcion:
    "Parte de un procedimiento sin detención: relato, lesiones, pruebas, especies, vehículos, daños, testigos, cámaras y diligencias.",
  secciones: SECCIONES_PARTE,
  camposRequeridos: ["tipoProcedimiento", "lugar", "fecha", "descripcionHechos"],
  camposOpcionales: [
    "especie",
    "detalleEspecies",
    "detencion.lesiones",
    "pruebas.alcoholemia",
    "pruebas.respiratoria",
    "vehiculos",
    "testigos",
    "camaras",
    "diligencias",
    "fiscal.instrucciones",
  ],
  reglasRedaccion: [
    "El primer párrafo abre con «Doy cuenta a esa Fiscalía Local que, el día de hoy …».",
    "Identifica a las personas involucradas dentro del relato, en línea corrida.",
    ...REGLAS_COMUNES,
  ],
  formato: FORMATO_INSTITUCIONAL,
  condicionesBloqueo: [
    "Hay contradicciones entre procedimientos distintos.",
    "Falta el tipo de procedimiento, el lugar, la fecha o el relato de los hechos.",
  ],
  mapeo: MAPEO_COMUN,
};

/** Denuncia por violencia intrafamiliar. */
export const PLANTILLA_VIF: DefinicionPlantilla = {
  id: "denuncia-vif",
  nombre: "Denuncia por violencia intrafamiliar",
  version: "1.1.0",
  descripcion:
    "Denuncia VIF: relato de la denunciante, lesiones, SERNAMEG, pauta de riesgo, testigos, cámaras, identidad del denunciado, control de armas y diligencias.",
  secciones: SECCIONES_VIF,
  camposRequeridos: ["tipoProcedimiento", "lugar", "fecha", "descripcionHechos"],
  camposOpcionales: [
    "detencion.lesiones",
    "testigos",
    "camaras",
    "diligencias",
    "fiscal.instrucciones",
  ],
  reglasRedaccion: [
    "El primer párrafo abre con «Se da cuenta a esa Fiscalía Local que, hoy siendo las HH:MM horas se presentó en el servicio de guardia …».",
    "Individualiza a la denunciante dentro del relato y distingue claramente sus manifestaciones de los hechos constatados.",
    "No califiques jurídicamente los hechos ni atribuyas delitos que no consten.",
    ...REGLAS_COMUNES,
  ],
  formato: FORMATO_INSTITUCIONAL,
  condicionesBloqueo: [
    "Hay contradicciones entre procedimientos distintos.",
    "Falta el tipo de procedimiento, el lugar, la fecha o el relato de los hechos.",
  ],
  mapeo: MAPEO_COMUN,
};

/** Plantillas disponibles, en el orden en que se ofrecen. */
export const PLANTILLAS: readonly DefinicionPlantilla[] = [
  PLANTILLA_DETENIDO,
  PLANTILLA_PARTE,
  PLANTILLA_VIF,
];

/** Busca una plantilla por su identificador. */
export const obtenerPlantilla = (
  id: string | null | undefined
): DefinicionPlantilla | null =>
  PLANTILLAS.find((plantilla) => plantilla.id === id) ?? null;

/**
 * Elige la plantilla según los antecedentes. Es una sugerencia determinística:
 * el funcionario puede cambiarla antes de generar el documento.
 */
export const elegirPlantilla = (
  antecedentes: Antecedentes
): DefinicionPlantilla => {
  if (esViolenciaIntrafamiliar(antecedentes.tipoProcedimiento)) {
    return PLANTILLA_VIF;
  }

  return esDetencion(antecedentes) ? PLANTILLA_DETENIDO : PLANTILLA_PARTE;
};

/** Resumen serializable de una plantilla (para la interfaz). */
export const resumenPlantilla = (plantilla: DefinicionPlantilla) => ({
  id: plantilla.id,
  nombre: plantilla.nombre,
  version: plantilla.version,
  descripcion: plantilla.descripcion,
  secciones: plantilla.secciones.map((seccion) => seccion.titulo),
  formato: plantilla.formato,
});
