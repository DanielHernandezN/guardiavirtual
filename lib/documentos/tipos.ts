import type { SeccionPlantilla } from "../plantillas";
import type { Antecedentes } from "../types";

/**
 * Contratos del motor documental — Guardia Virtual
 * ────────────────────────────────────────────────
 * Separan las responsabilidades del flujo: ingesta, extracción, validación,
 * plantilla de destino, mapeo, redacción, revisión humana y generación Word.
 *
 * El modelo de IA propone contenido; la estructura, las validaciones y la
 * trazabilidad las controla el código.
 */

/** Estado de un antecedente respecto de la fuente. */
export type EstadoExtraccion =
  | "extraido"
  | "faltante"
  | "dudoso"
  | "no_aplica";

/**
 * Trazabilidad de un campo.
 *
 * `confianza` queda en `null`: el proveedor de IA configurado no entrega una
 * estimación calibrada, y una probabilidad del modelo no garantiza exactitud.
 */
export type MarcaCampo = {
  estado: EstadoExtraccion;
  confianza: number | null;
  /** Extracto literal del documento donde aparece el dato, si se localizó. */
  fuente: string | null;
  observaciones: string[];
};

/** Trazabilidad por ruta de campo (por ejemplo, `detenido.rut`). */
export type Trazabilidad = {
  campos: Record<string, MarcaCampo>;
};

/** Nivel de una observación de validación. */
export type NivelObservacion = "error" | "advertencia" | "info";

/** Observación detectada al validar los antecedentes. */
export type Observacion = {
  nivel: NivelObservacion;
  /** Ruta del campo afectado (por ejemplo, `detenido.rut`). */
  campo: string;
  mensaje: string;
};

/** Formatos de origen admitidos. */
export type TipoArchivo = "txt" | "docx" | "pdf";

/** Resultado de la ingesta documental. */
export type ResultadoIngesta =
  | {
      ok: true;
      nombre: string;
      tipo: TipoArchivo;
      texto: string;
      caracteres: number;
      metodo: "texto" | "docx" | "pdf";
      paginas: number | null;
      advertencias: string[];
      requiereOcr: false;
    }
  | {
      ok: false;
      motivo: "tipo" | "vacio" | "ocr" | "lectura";
      error: string;
      advertencias: string[];
    };

/** Formato de salida del documento institucional. */
export type FormatoDocumento = {
  fuente: string;
  tamanoPuntos: number;
  /** Interlineado múltiplo (1.5 = 1,5 líneas). */
  interlineado: number;
  margenesCm: {
    superior: number;
    inferior: number;
    izquierdo: number;
    derecho: number;
  };
  justificado: boolean;
};

/**
 * Definición explícita de una plantilla de destino.
 *
 * La estructura y el orden no dependen de un prompt: se declaran aquí y el
 * servidor los impone al ensamblar el documento.
 */
export type DefinicionPlantilla = {
  id: string;
  nombre: string;
  version: string;
  descripcion: string;
  /** Secciones en el orden en que deben aparecer. */
  secciones: readonly SeccionPlantilla[];
  /** Rutas de antecedentes indispensables para generar. */
  camposRequeridos: readonly string[];
  /** Rutas opcionales (si faltan, la sección se omite). */
  camposOpcionales: readonly string[];
  reglasRedaccion: readonly string[];
  formato: FormatoDocumento;
  /** Motivos por los que no se puede generar el documento. */
  condicionesBloqueo: readonly string[];
  /** Ruta del antecedente → título de la sección que lo usa. */
  mapeo: Readonly<Record<string, string>>;
};

/** Metadatos del documento de origen (sin guardar el texto completo aquí). */
export type OrigenDocumento = {
  nombre: string;
  tipo: TipoArchivo;
  metodo: "texto" | "docx" | "pdf";
  caracteres: number;
  paginas: number | null;
  /** Huella SHA-256 del archivo recibido. */
  hash: string;
  procesadoEn: string;
  advertencias: string[];
};

/** Resultado completo del procesamiento documental. */
export type DocumentoProcesado = {
  origen: OrigenDocumento;
  plantilla: { id: string; nombre: string; version: string };
  antecedentes: Antecedentes;
  trazabilidad: Trazabilidad;
  observaciones: Observacion[];
  faltantes: string[];
  /** Antecedentes relevantes que no tienen sección de destino. */
  sinDestino: string[];
  puedeRedactar: boolean;
  bloqueos: string[];
};
