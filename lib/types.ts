/**
 * Tipos del dominio — Guardia Virtual
 * ────────────────────────────────────────────────────
 * Define la estructura de datos del "parte policial" y de los
 * antecedentes que la IA extrae a partir de los mensajes del funcionario.
 *
 * Esta es la referencia canónica del contrato de datos. Tanto el backend
 * (`app/api/**`) como el frontend (`app/components/**`) deben usar estos
 * tipos en vez de redefinirlos.
 */

/**
 * Datos de identificación de la persona detenida.
 * Todos los campos son `null` cuando el procedimiento no es una detención
 * o cuando el dato no fue informado.
 */
export type DatosDetenido = {
  /** Nombre completo. */
  nombre: string | null;
  /** RUT con puntos y guion, tal como lo entrega el funcionario. */
  rut: string | null;
  /** Edad como texto ("33 años"). */
  edad: string | null;
  nacionalidad: string | null;
  estadoCivil: string | null;
  /** Nivel de estudios (por ejemplo, "estudios medios"). */
  estudios: string | null;
  /** Profesión u oficio. */
  ocupacion: string | null;
  /** Fecha de nacimiento en formato `dd/mm/yyyy`. */
  fechaNacimiento: string | null;
  domicilio: string | null;
  telefono: string | null;
  correo: string | null;
};

/**
 * Funcionario que interviene en el procedimiento.
 * Se usa para el bloque de firmas del parte.
 */
export type FuncionarioParte = {
  /** Grado (por ejemplo, "Sargento 2do." o "Cabo 1ro."). */
  grado: string | null;
  /** Nombre completo. */
  nombre: string | null;
};

/**
 * Fiscal de turno y las instrucciones que impartió.
 * Todos los documentos de la unidad cierran con este bloque.
 */
export type DatosFiscal = {
  /** Nombre del fiscal de turno. */
  nombre: string | null;
  /** Folio de la bitácora web (por ejemplo, "2026-4-44151"). */
  folio: string | null;
  /** Instrucciones, en orden y sin numeración. */
  instrucciones: string[];
};

/** Circunstancias de la detención. */
export type DatosDetencion = {
  /** Hora de la detención en formato `HH:mm`. */
  hora: string | null;
  /** Fecha de la detención en formato `dd/mm/yyyy`. */
  fechaDetencion: string | null;
  /** Delito o falta que motivó la detención. */
  delito: string | null;
  /** Lugar exacto de la detención. */
  lugarDetencion: string | null;
  /** Grado y nombre del personal aprehensor. */
  personalAprehensor: string | null;
  /** Grado y nombre del personal que acompaña. */
  personalAcompanante: string | null;
  /** Vehículo policial (por ejemplo, "RP-4545"). */
  vehiculo: string | null;
  /** Resultado de la constatación de lesiones (por ejemplo, "sin lesiones"). */
  lesiones: string | null;
  /** Situación procesal del detenido (por ejemplo, "pasa a control de detención"). */
  situacion: string | null;
};

/**
 * Pruebas o peritajes informados (alcoholemia, respiratoria, otras).
 * Se transcriben tal como constan: si no hay resultado, el campo queda `null`
 * y **nunca se deduce** a partir de otros antecedentes.
 */
export type DatosPruebas = {
  /** Resultado de la alcoholemia (por ejemplo, "1,42 g/L"). */
  alcoholemia: string | null;
  /** Resultado de la prueba respiratoria (por ejemplo, "0,58 mg/L"). */
  respiratoria: string | null;
  /** Otras pruebas o peritajes informados. */
  otras: string[];
};

/** Vehículo involucrado en el procedimiento. */
export type VehiculoInvolucrado = {
  patente: string | null;
  marca: string | null;
  modelo: string | null;
  color: string | null;
  anio: string | null;
  /** Documentación del vehículo (padrón, revisión técnica, permiso de circulación). */
  documentos: string | null;
  /** Seguros asociados al vehículo. */
  seguros: string | null;
  /** Licencia de conducir del conductor del vehículo. */
  licencias: string | null;
};

/** Testigo del procedimiento. */
export type Testigo = {
  nombre: string | null;
  rut: string | null;
  /** Declaración o relación con los hechos, tal como consta. */
  declaracion: string | null;
};

/**
 * Antecedentes acumulados de un procedimiento.
 *
 * Todos los campos de texto son `null` cuando la información no está
 * disponible o no fue entregada por el funcionario. **Nunca se usa
 * "pendiente" ni cadenas vacías**: la ausencia se representa con `null`.
 */
export type Antecedentes = {
  /** Tipo de procedimiento: hurto, robo, accidente, etc. o `null`. */
  tipoProcedimiento: string | null;
  /** Especie involucrada: bicicleta, vehículo, celular, etc. o `null`. */
  especie: string | null;
  /** Lugar de ocurrencia del hecho o `null`. */
  lugar: string | null;
  /** Fecha del hecho en formato `dd/mm/yyyy` o `null`. */
  fecha: string | null;
  /** Resumen objetivo del hecho narrado o `null`. */
  descripcionHechos: string | null;
  /** Identificación de la persona detenida (vacía si no hay detención). */
  detenido: DatosDetenido;
  /** Circunstancias de la detención (vacías si no hay detención). */
  detencion: DatosDetencion;
  /** Personal a cargo del procedimiento (uno por firma). */
  funcionarios: FuncionarioParte[];
  /** Fiscal de turno y sus instrucciones. */
  fiscal: DatosFiscal;
  /** Pruebas respiratorias, alcoholemias y otras peritajes. */
  pruebas: DatosPruebas;
  /** Vehículos involucrados, con su documentación si consta. */
  vehiculos: VehiculoInvolucrado[];
  /** Testigos del procedimiento. */
  testigos: Testigo[];
  /** Existencia y aporte de cámaras de seguridad. */
  camaras: string | null;
  /** Diligencias practicadas o pendientes. */
  diligencias: string[];
  /** Detalle de especies (marca, modelo, serie, avalúo), si consta. */
  detalleEspecies: string | null;
  /** Inconsistencias o datos en conflicto detectados. */
  contradicciones: string[];
};

/**
 * Campos mínimos que deben existir para poder confeccionar un borrador.
 * Si alguno falta, `puedeConfeccionarBorrador` es `false`.
 */
export const CAMPOS_OBLIGATORIOS = [
  { key: "tipoProcedimiento", label: "el tipo de procedimiento" },
  { key: "especie", label: "la especie involucrada" },
  { key: "lugar", label: "el lugar de ocurrencia" },
  { key: "fecha", label: "la fecha del procedimiento" },
] as const;

export type CampoObligatorio = (typeof CAMPOS_OBLIGATORIOS)[number]["key"];

/**
 * Respuesta completa que devuelve la API de análisis de antecedentes.
 * Incluye los antecedentes normalizados más la evaluación del caso.
 */
export type ResultadoAnalisis = Antecedentes & {
  /** Texto breve con la evaluación del caso, pensado para el chat. */
  respuesta: string;
  /** `true` solo si no falta ningún campo obligatorio. */
  puedeConfeccionarBorrador: boolean;
  /** Etiquetas de los campos obligatorios que faltan. */
  faltantes: string[];
  /**
   * `true` cuando el mensaje actual describía un procedimiento DISTINTO
   * al de los antecedentes acumulados. En ese caso el estado acumulado se
   * reemplazó en lugar de mezclarse.
   */
  cambioDeProcedimiento: boolean;
};

/** Sección del borrador del parte (encabezado + contenido). */
export type SeccionBorrador = {
  titulo: string;
  contenido: string;
};

/**
 * Borrador del parte policial generado por la IA.
 * Es un borrador editable: el funcionario debe revisarlo antes de usarlo.
 */
export type BorradorParte = {
  /** Título formal del parte (resuelto por la plantilla). */
  titulo: string;
  /** Secciones del documento, en orden. */
  secciones: SeccionBorrador[];
  /** Texto completo concatenado (título + secciones). */
  textoCompleto: string;
  /** Fecha de generación en formato ISO. */
  generadoEn: string;
  /** Plantilla usada al generar (para trazabilidad y exportación a Word). */
  plantilla?: { id: string; nombre: string; version: string };
};

/** Respuesta de la API de generación del borrador. */
export type ResultadoBorrador =
  | { ok: true; borrador: BorradorParte }
  | { ok: false; error: string; faltantes?: string[] };
