/**
 * Plantillas del parte policial — Guardia Virtual
 * ───────────────────────────────────────────────
 * Estructura formal del documento según el formato real de la unidad
 * (9na. Comisaría Pucón). El título y las secciones se resuelven en el
 * servidor (determinístico); el modelo solo redacta el contenido.
 *
 * Los documentos de la unidad **no llevan título interno**:
 * 1. Membrete institucional (Carabineros de Chile, Prefectura, Comisaría).
 * 2. Fórmula de apertura («Doy cuenta a esa Fiscalía Local…» o
 *    «Se da cuenta…») seguida del relato con párrafos «Que, …».
 * 3. Secciones en mayúsculas, solo las que tengan datos (LESIONES, DERECHOS,
 *    ESPECIES SUSTRAÍDAS, etc.).
 * 4. Instrucciones del fiscal de turno.
 * 5. Situación del detenido (si corresponde).
 * 6. Firmas de los funcionarios a cargo, con grado y nombre.
 */

import type {
  DatosFiscal,
  FuncionarioParte,
  SeccionBorrador,
} from "./types";

/** Título interno de la sección que contiene el membrete del documento. */
export const TITULO_ENCABEZADO = "ENCABEZADO";

/** Título interno de la sección que contiene el relato (no imprime título). */
export const TITULO_RELATO = "RELATO";

/** Título interno de la sección que contiene las firmas. */
export const TITULO_PIE = "CIERRE Y FIRMA";

/** Título de la sección de instrucciones del fiscal de turno. */
export const TITULO_INSTRUCCIONES = "INSTRUCCIONES DEL FISCAL DE TURNO";

/** Título de la sección de situación del detenido. */
export const TITULO_SITUACION = "SITUACIÓN DEL DETENIDO";

/** Sección de la plantilla: título visible + indicación para el modelo. */
export type SeccionPlantilla = {
  titulo: string;
  /** Qué debe contener la sección (se envía al modelo al redactar). */
  instruccion: string;
};

/** Apertura y relato del parte cuando hay una detención. */
const RELATO_DETENIDO: SeccionPlantilla = {
  titulo: TITULO_RELATO,
  instruccion:
    "Relato completo del procedimiento, en tercera persona y pasado. El primer párrafo empieza con la fórmula de apertura: «Doy cuenta a esa Fiscalía Local que, el [fecha], siendo las HH:MM horas, personal de servicio …» (usa «el día de hoy» solo si el hecho ocurrió hoy). Cada hecho o actuación va en un párrafo aparte, separado por un salto de línea, que comienza con «Que, » (o con el conector de momento «Una vez en el lugar…»). Identifica a las personas dentro del relato, en línea corrida (nombre, edad, nacionalidad, estado civil, estudios, ocupación, fecha de nacimiento, cédula de identidad, domicilio, teléfono y correo), sin listas «Etiqueta: valor».",
};

/** Apertura y relato de una denuncia (por ejemplo, violencia intrafamiliar). */
const RELATO_DENUNCIA: SeccionPlantilla = {
  titulo: TITULO_RELATO,
  instruccion:
    "Relato completo de la denuncia, en tercera persona y pasado. El primer párrafo empieza con la fórmula de apertura: «Se da cuenta a esa Fiscalía Local que, el [fecha], siendo las HH:MM horas, se presentó en el servicio de guardia de esta unidad [nombre], individualizada en el rubro denunciante/víctima, quien da cuenta del siguiente hecho:» (usa «el día de hoy» solo si la denuncia es de hoy). Cada párrafo siguiente va separado por un salto de línea y comienza con «Que, ». Identifica a las personas dentro del relato, en línea corrida, sin listas «Etiqueta: valor».",
};

/** Relato de un procedimiento general (hurto, robo, accidente, etc.). */
const RELATO_PARTE: SeccionPlantilla = {
  titulo: TITULO_RELATO,
  instruccion:
    "Relato completo del procedimiento, en tercera persona y pasado. El primer párrafo empieza con la fórmula de apertura: «Doy cuenta a esa Fiscalía Local que, el [fecha], siendo las HH:MM horas, personal de servicio …» (usa «el día de hoy» solo si el hecho ocurrió hoy). Cada hecho o actuación va en un párrafo aparte, separado por un salto de línea, que comienza con «Que, ». Identifica a las personas dentro del relato, en línea corrida (nombre, edad, nacionalidad, estado civil, estudios, ocupación, fecha de nacimiento, cédula de identidad, domicilio, teléfono y correo), sin listas «Etiqueta: valor».",
};

const LESIONES: SeccionPlantilla = {
  titulo: "LESIONES",
  instruccion:
    "Constatación de lesiones de cada persona, en el orden del relato: carácter (leve, grave o sin lesiones) y número de D.A.U. o F.A.U. si consta. Si hay detalle por región (cabeza, cara, extremidades), transcríbelo. No inventes diagnósticos.",
};

const DERECHOS: SeccionPlantilla = {
  titulo: "DERECHOS",
  instruccion:
    "Lectura y ratificación de derechos del imputado: motivo de la detención, forma en que se le informaron (verbal en el lugar, por escrito en la unidad) y artículos invocados (93, 94 y 135 del C.P.P.) solo si constan.",
};

const VERIFICACION: SeccionPlantilla = {
  titulo: "VERIFICACIÓN DE IDENTIDAD",
  instruccion:
    "Cómo se verificó la identidad del imputado (cédula de identidad, sistema biométrico del Registro Civil) y si hubo rectificación de datos. Si los antecedentes no lo dicen, NO devuelvas esta sección.",
};

const ANTECEDENTES: SeccionPlantilla = {
  titulo: "ANTECEDENTES",
  instruccion:
    "Antecedentes penales del imputado, órdenes de detención vigentes y registro general de condenas, SOLO si el funcionario informó el resultado de la consulta. Si no hay información, NO devuelvas esta sección.",
};

/** Resultados de pruebas respiratorias y alcoholemias informados. */
const PRUEBAS: SeccionPlantilla = {
  titulo: "PRUEBAS RESPIRATORIAS Y ALCOHOLEMIA",
  instruccion:
    "Resultado de las pruebas practicadas: alcoholemia (g/L), respiratoria (mg/L) y otras, con el instrumento o procedimiento si consta. Transcribe solo los resultados informados; si la prueba se practicó pero no hay resultado, no inventes un valor.",
};

/** Vehículos involucrados en el procedimiento. */
const VEHICULOS: SeccionPlantilla = {
  titulo: "VEHÍCULOS",
  instruccion:
    "Vehículos involucrados: patente, marca, modelo, color y año, uno por línea. No repitas aquí la documentación, los seguros ni las licencias, que tienen su propia sección.",
};

const ESPECIES: SeccionPlantilla = {
  titulo: "ESPECIES SUSTRAÍDAS",
  instruccion:
    "Detalle de las especies sustraídas, recuperadas o entregadas: cantidad, tipo, marca, modelo, color, número de serie o IMEI y avalúo total si consta. Una línea por especie.",
};

const INCAUTACION: SeccionPlantilla = {
  titulo: "INCAUTACIÓN",
  instruccion:
    "Especies o elementos incautados, con marca, modelo, número de serie y cadena de custodia o N.U.E. si consta.",
};

const GRABACIONES: SeccionPlantilla = {
  titulo: "GRABACIONES Y CADENA DE CUSTODIA",
  instruccion:
    "Registro audiovisual o evidencia remitida, con el número de cadena de custodia o N.U.E. Solo si consta.",
};

const DAÑOS: SeccionPlantilla = {
  titulo: "DAÑOS",
  instruccion:
    "Daños materiales en vehículos, inmuebles o especies, indicando la parte afectada. Solo si consta.",
};

const AVALUO: SeccionPlantilla = {
  titulo: "AVALÚO",
  instruccion:
    "Forma en que se determinará el avalúo (por la víctima ante la Fiscalía, por el Tribunal, etc.) o su monto si consta.",
};

const TESTIGOS: SeccionPlantilla = {
  titulo: "TESTIGOS",
  instruccion:
    "Testigos del procedimiento: nombre, edad y relación con los hechos. Si no hay, indícalo.",
};

const CAMARAS: SeccionPlantilla = {
  titulo: "CÁMARAS DE SEGURIDAD",
  instruccion:
    "Existencia de cámaras, quién las aportó y cómo se remitió el registro. Si no existen, indícalo.",
};

const LICENCIAS: SeccionPlantilla = {
  titulo: "LICENCIAS DE CONDUCTOR",
  instruccion:
    "Licencias de los conductores: clase, municipalidad, fecha de control y vigencia. Solo si consta.",
};

const SEGUROS_OBLIGATORIOS: SeccionPlantilla = {
  titulo: "SEGUROS OBLIGATORIOS",
  instruccion:
    "Seguro obligatorio de cada vehículo: aseguradora, póliza y vigencia. Solo si consta.",
};

const SEGUROS_COMPLEMENTARIOS: SeccionPlantilla = {
  titulo: "SEGUROS COMPLEMENTARIOS",
  instruccion:
    "Seguros complementarios de los conductores. Si no mantienen, indícalo.",
};

const DILIGENCIAS: SeccionPlantilla = {
  titulo: "DILIGENCIAS",
  instruccion:
    "Diligencias practicadas o pendientes (fijaciones fotográficas, empadronamiento, pericias, etc.). Solo las que constan.",
};

const SERNAMEG: SeccionPlantilla = {
  titulo: "CONSENTIMIENTO SERNAMEG",
  instruccion:
    "Si la denunciante autoriza que sus datos se informen al Servicio Nacional de la Mujer y la Equidad de Género, y si firmó el acta. Solo si consta.",
};

const PAUTA_RIESGO: SeccionPlantilla = {
  titulo: "PAUTA RIESGO",
  instruccion:
    "Resultado de la pauta de riesgo de violencia intrafamiliar, con su puntaje si consta.",
};

const IDENTIDAD_DENUNCIADO: SeccionPlantilla = {
  titulo: "IDENTIDAD DEL DENUNCIADO",
  instruccion:
    "Identidad del denunciado verificada en el Registro Civil: nombre, edad, nacionalidad, estado civil, cédula, fecha de nacimiento, domicilio y antecedentes penales. Solo si consta.",
};

const CONTROL_ARMAS: SeccionPlantilla = {
  titulo: "CONTROL DE ARMAS",
  instruccion:
    "Consulta a la unidad de fiscalización de armas: si el denunciado registra o no armas a su nombre. Solo si consta.",
};

/** Secciones del parte general, en orden. */
export const SECCIONES_PARTE: readonly SeccionPlantilla[] = [
  RELATO_PARTE,
  LESIONES,
  PRUEBAS,
  ESPECIES,
  INCAUTACION,
  VEHICULOS,
  GRABACIONES,
  DAÑOS,
  AVALUO,
  TESTIGOS,
  CAMARAS,
  DILIGENCIAS,
];

/** Secciones del parte de detenido, en orden. */
export const SECCIONES_DETENIDO: readonly SeccionPlantilla[] = [
  RELATO_DETENIDO,
  DERECHOS,
  LESIONES,
  PRUEBAS,
  VERIFICACION,
  ANTECEDENTES,
  ESPECIES,
  INCAUTACION,
  VEHICULOS,
  DAÑOS,
  AVALUO,
  TESTIGOS,
  CAMARAS,
  LICENCIAS,
  SEGUROS_OBLIGATORIOS,
  SEGUROS_COMPLEMENTARIOS,
  DILIGENCIAS,
];

/** Secciones de una denuncia por violencia intrafamiliar. */
export const SECCIONES_VIF: readonly SeccionPlantilla[] = [
  RELATO_DENUNCIA,
  LESIONES,
  SERNAMEG,
  PAUTA_RIESGO,
  TESTIGOS,
  CAMARAS,
  IDENTIDAD_DENUNCIADO,
  CONTROL_ARMAS,
  DILIGENCIAS,
];

/** Indica si el procedimiento es una denuncia por violencia intrafamiliar. */
export const esViolenciaIntrafamiliar = (
  tipoProcedimiento: string | null | undefined
): boolean =>
  /violencia|vif|intrafamiliar/i.test(tipoProcedimiento ?? "");

/**
 * Devuelve las secciones que corresponden al tipo de parte.
 *
 * La violencia intrafamiliar tiene secciones propias; las detenciones usan la
 * plantilla de detenido y el resto, la plantilla general.
 */
export const seccionesPara = (
  detencion: boolean,
  tipoProcedimiento: string | null = null
): readonly SeccionPlantilla[] => {
  if (esViolenciaIntrafamiliar(tipoProcedimiento)) {
    return SECCIONES_VIF;
  }

  return detencion ? SECCIONES_DETENIDO : SECCIONES_PARTE;
};

/** Datos del membrete institucional del documento. */
export type DatosMembrete = {
  /** Prefectura (por ejemplo, "Prefectura Villarrica Nro. 3"). */
  prefectura?: string | null;
  /** Unidad (por ejemplo, "9na. Comisaría Pucón"). */
  unidad?: string | null;
};

/**
 * Construye el membrete del documento. Si no hay prefectura ni unidad,
 * devuelve una cadena vacía para no inventar datos institucionales.
 */
export const construirMembrete = ({
  prefectura,
  unidad,
}: DatosMembrete): string => {
  const lineas = [prefectura, unidad]
    .map((linea) => linea?.trim())
    .filter((linea): linea is string => Boolean(linea))
    .map((linea) => linea.toUpperCase());

  return lineas.length > 0
    ? ["CARABINEROS DE CHILE", ...lineas].join("\n")
    : "";
};

/**
 * Construye el bloque de instrucciones del fiscal de turno.
 * Devuelve `null` si no hay ningún dato del fiscal.
 */
export const construirInstruccionesFiscal = (
  fiscal: DatosFiscal
): string | null => {
  const instrucciones = fiscal.instrucciones
    .map((instruccion) => instruccion.trim())
    .filter(Boolean);

  if (!fiscal.nombre && !fiscal.folio && instrucciones.length === 0) {
    return null;
  }

  const nombre = fiscal.nombre?.trim();
  const folio = fiscal.folio?.trim();
  const contacto = [
    nombre ? `el fiscal de turno ${nombre}` : "el fiscal de turno",
    folio ? `mediante folio N° ${folio}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `Se tomó contacto con ${contacto}, quien instruyó lo siguiente:`,
    ...instrucciones.map(
      (instruccion, indice) => `${indice + 1}. ${instruccion}`
    ),
  ].join("\n");
};

/**
 * Construye el bloque de firmas con los funcionarios a cargo del
 * procedimiento. Devuelve una cadena vacía si no hay funcionarios.
 */
export const construirPieParte = (
  funcionarios: readonly FuncionarioParte[]
): string => {
  const lineas = funcionarios
    .map((funcionario) =>
      [funcionario.grado?.trim(), funcionario.nombre?.trim()]
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean);

  if (lineas.length === 0) {
    return "";
  }

  return [
    "DATOS DE LOS FUNCIONARIOS A CARGO DEL PROCEDIMIENTO.",
    "",
    ...lineas.map(
      (linea) => `${linea.padEnd(42, " ")} _________________________`
    ),
  ].join("\n");
};

/**
 * Compone el texto plano del parte tal como se imprime en la unidad:
 * membrete, relato, secciones y firmas. No incluye el título interno del
 * borrador porque el formato oficial no lo lleva.
 */
export const componerTextoParte = (
  _titulo: string,
  secciones: readonly SeccionBorrador[]
): string => {
  const buscar = (titulo: string) =>
    secciones.find((seccion) => seccion.titulo === titulo);

  const encabezado = buscar(TITULO_ENCABEZADO);
  const relato = buscar(TITULO_RELATO);
  const pie = buscar(TITULO_PIE);
  const cuerpo = secciones.filter(
    (seccion) =>
      seccion.titulo !== TITULO_ENCABEZADO &&
      seccion.titulo !== TITULO_RELATO &&
      seccion.titulo !== TITULO_PIE
  );

  return [
    encabezado?.contenido,
    relato?.contenido,
    ...cuerpo.map((seccion) => `${seccion.titulo}: ${seccion.contenido}`),
    pie?.contenido,
  ]
    .filter((bloque): bloque is string => Boolean(bloque?.trim()))
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
