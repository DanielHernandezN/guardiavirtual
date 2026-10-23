import {
  CAMPOS_OBLIGATORIOS,
  type Antecedentes,
  type DatosDetencion,
  type DatosDetenido,
} from "./types";

/**
 * Utilidades de dominio — Guardia Virtual
 * ───────────────────────────────────────
 * Funciones puras que operan sobre los antecedentes: detección de campos
 * faltantes y generación de mensajes conversacionales para el funcionario.
 */

/** Datos del detenido con todos los campos vacíos. */
export const DETENIDO_VACIO: DatosDetenido = {
  nombre: null,
  rut: null,
  edad: null,
  nacionalidad: null,
  estadoCivil: null,
  estudios: null,
  ocupacion: null,
  fechaNacimiento: null,
  domicilio: null,
  telefono: null,
  correo: null,
};

/** Circunstancias de la detención con todos los campos vacíos. */
export const DETENCION_VACIA: DatosDetencion = {
  hora: null,
  fechaDetencion: null,
  delito: null,
  lugarDetencion: null,
  personalAprehensor: null,
  personalAcompanante: null,
  vehiculo: null,
  lesiones: null,
};

/** Crea unos antecedentes sin datos (caso nuevo). */
export const crearAntecedentesVacios = (): Antecedentes => ({
  tipoProcedimiento: null,
  especie: null,
  lugar: null,
  fecha: null,
  descripcionHechos: null,
  detenido: { ...DETENIDO_VACIO },
  detencion: { ...DETENCION_VACIA },
  contradicciones: [],
});

/**
 * Indica si el procedimiento corresponde a un parte de detenido.
 *
 * Se considera detención cuando hay algún dato del detenido o cuando el
 * tipo de procedimiento lo señala explícitamente.
 */
export const esDetencion = (
  datos: Pick<Antecedentes, "tipoProcedimiento" | "detenido">
): boolean => {
  const hayDatosDelDetenido = Object.values(datos.detenido ?? {}).some(
    (valor) => Boolean(valor)
  );

  return (
    hayDatosDelDetenido || /deten|aprehen/i.test(datos.tipoProcedimiento ?? "")
  );
};

/**
 * Combina dos objetos de datos planos conservando los valores ya conocidos
 * cuando el nuevo objeto trae `null`. Se usa para acumular los datos del
 * detenido y de la detención entre mensajes del chat.
 */
export const combinarDatos = <T extends Record<string, string | null>>(
  nuevo: T,
  previo: T
): T => {
  const resultado = { ...previo };

  for (const clave of Object.keys(nuevo) as Array<keyof T>) {
    if (nuevo[clave]) {
      resultado[clave] = nuevo[clave];
    }
  }

  return resultado;
};

/** Devuelve las etiquetas de los campos obligatorios que aún faltan. */
export const camposFaltantes = (antecedentes: Antecedentes): string[] =>
  CAMPOS_OBLIGATORIOS.filter(({ key }) => !antecedentes[key]).map(
    ({ label }) => label
  );

/**
 * Indica si se puede redactar el borrador del parte.
 *
 * Hace falta que estén todos los campos obligatorios **y** que no haya
 * contradicciones: mezclar dos procedimientos distintos (por ejemplo, una
 * denuncia de violencia intrafamiliar y un robo) invalidaría el parte.
 */
export const puedeRedactarBorrador = (antecedentes: Antecedentes): boolean =>
  camposFaltantes(antecedentes).length === 0 &&
  antecedentes.contradicciones.length === 0;

/** Formatea una lista en español: "a", "a y b", "a, b y c". */
export const formatoLista = (items: string[]): string => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
};

/** Genera el mensaje conversacional según los campos que falten. */
export const crearRespuestaConversacional = (faltantes: string[]): string => {
  if (faltantes.length === 0) {
    return "Con los antecedentes disponibles puedo continuar con la confección del borrador.";
  }

  return `Para continuar necesito que indiques ${formatoLista(faltantes)}.`;
};
