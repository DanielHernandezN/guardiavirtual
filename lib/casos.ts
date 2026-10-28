import type { Antecedentes, SeccionBorrador } from "./types";

/**
 * Casos — Guardia Virtual
 * ───────────────────────
 * Tipos y serialización de la capa de persistencia.
 * La base de datos guarda JSON como texto; este módulo lo convierte a
 * los tipos del dominio.
 */

/** Marca de trazabilidad de un campo respecto del documento de origen. */
export type MarcaCampoGuardada = {
  estado?: string;
  confianza?: number | null;
  fuente?: string | null;
  observaciones?: string[];
};

/** Metadatos del documento de origen guardados con el caso. */
export type DocumentoGuardado = {
  origen?: {
    nombre?: string;
    tipo?: string;
    metodo?: string;
    caracteres?: number;
    paginas?: number | null;
    hash?: string;
    procesadoEn?: string;
    advertencias?: string[];
  };
  plantilla?: { id?: string; nombre?: string; version?: string };
  observaciones?: Array<{
    nivel?: string;
    campo?: string;
    mensaje?: string;
  }>;
  faltantes?: string[];
  sinDestino?: string[];
  trazabilidad?: Record<string, MarcaCampoGuardada>;
};

export type BorradorGuardado = {
  id: string;
  titulo: string;
  texto: string;
  secciones: SeccionBorrador[];
  estado: string;
  /** `id@version` de la plantilla usada, si consta. */
  plantilla: string | null;
  generadoEn: string;
  confirmadoEn: string | null;
};

export type CasoResumen = {
  id: string;
  titulo: string;
  tipoProcedimiento: string | null;
  especie: string | null;
  lugar: string | null;
  fecha: string | null;
  estado: string;
  creadoEn: string;
  actualizadoEn: string;
  /** `true` si el caso está en la papelera (eliminado lógicamente). */
  enPapelera: boolean;
  antecedentes: Antecedentes;
  /** Trazabilidad del documento de origen (si el caso nació de un archivo). */
  documento: DocumentoGuardado | null;
  borradores: BorradorGuardado[];
};

/** Convierte un JSON almacenado en un arreglo de secciones. */
export const parseSecciones = (valor: string): SeccionBorrador[] => {
  try {
    const datos = JSON.parse(valor);
    if (!Array.isArray(datos)) return [];

    return datos.filter(
      (seccion): seccion is SeccionBorrador =>
        typeof seccion?.titulo === "string" &&
        typeof seccion?.contenido === "string"
    );
  } catch {
    return [];
  }
};

/** Convierte los antecedentes almacenados en un objeto. */
export const parseAntecedentes = (valor: string): Record<string, unknown> => {
  try {
    const datos = JSON.parse(valor);
    return datos && typeof datos === "object" ? datos : {};
  } catch {
    return {};
  }
};

/** Convierte la trazabilidad almacenada en un objeto tipado. */
export const parseDocumento = (valor: string | null): DocumentoGuardado | null => {
  if (!valor) return null;

  try {
    const datos = JSON.parse(valor);
    return datos && typeof datos === "object" && !Array.isArray(datos)
      ? (datos as DocumentoGuardado)
      : null;
  } catch {
    return null;
  }
};

/** Sección del borrador con los datos que quedaron pendientes. */
export type SeccionConPendientes = {
  titulo: string;
  /** Descripción de cada dato pendiente (vacío si no es legible). */
  pendientes: string[];
};

/**
 * Extrae los datos que el modelo dejó como `[PENDIENTE]` en cada sección.
 * Sirve para mostrarle al funcionario qué falta completar antes de
 * confirmar el parte.
 *
 * El modelo escribe el dato pendiente como "campo: [PENDIENTE]", así que
 * el nombre del campo se toma del texto anterior al marcador.
 */
export const extraerPendientes = (
  secciones: SeccionBorrador[]
): SeccionConPendientes[] =>
  secciones
    .map((seccion) => {
      const marcadores = seccion.contenido.match(/\[PENDIENTE\]/gi);

      if (!marcadores) {
        return { titulo: seccion.titulo, pendientes: [] as string[] };
      }

      // Al separar por el marcador, cada trozo va DESPUÉS de un [PENDIENTE].
      // El nombre del campo está al final del trozo anterior.
      const partes = seccion.contenido.split(/\[PENDIENTE\]/gi);

      const pendientes = partes.slice(1).map((_, indice) => {
        const previo = partes[indice];
        const campo =
          previo
            .split(/[.;\n]/)
            .pop()
            ?.replace(/[:\s]+$/, "")
            .trim() ?? "";

        return campo.slice(0, 70) || "dato sin especificar";
      });

      return { titulo: seccion.titulo, pendientes };
    })
    .filter((seccion) => seccion.pendientes.length > 0);

/** Construye el título de un caso a partir de sus antecedentes. */
export const tituloDeCaso = (datos: {
  tipoProcedimiento?: string | null;
  especie?: string | null;
  /** Circunstancias de la detención, si el caso es un parte de detenido. */
  detencion?: { delito?: string | null } | null;
}): string => {
  const delito = datos.detencion?.delito?.trim();
  if (delito) {
    return `Detención por ${delito.toLocaleLowerCase("es")}`;
  }

  const tipo = datos.tipoProcedimiento?.trim();
  const especie = datos.especie?.trim();

  if (tipo && especie) return `${tipo[0].toUpperCase()}${tipo.slice(1)} de ${especie}`;
  if (tipo) return `${tipo[0].toUpperCase()}${tipo.slice(1)}`;
  if (especie) return especie;
  return "Caso sin identificar";
};

/** Forma de una fila de la tabla `caso` con sus borradores. */
type FilaCaso = {
  id: string;
  titulo: string;
  tipoProcedimiento: string | null;
  especie: string | null;
  lugar: string | null;
  fecha: string | null;
  estado: string;
  createdAt: Date;
  updatedAt: Date;
  antecedentes: string;
  documento: string | null;
  eliminadoEn: Date | null;
  borradores: Array<{
    id: string;
    titulo: string;
    texto: string;
    secciones: string;
    estado: string;
    plantilla: string | null;
    generadoEn: Date;
    confirmadoEn: Date | null;
  }>;
};

/** Convierte una fila de Prisma al tipo que consume el frontend. */
export const toCasoResumen = (fila: FilaCaso): CasoResumen => ({
  id: fila.id,
  titulo: fila.titulo,
  tipoProcedimiento: fila.tipoProcedimiento,
  especie: fila.especie,
  lugar: fila.lugar,
  fecha: fila.fecha,
  estado: fila.estado,
  creadoEn: fila.createdAt.toISOString(),
  actualizadoEn: fila.updatedAt.toISOString(),
  enPapelera: Boolean(fila.eliminadoEn),
  antecedentes: parseAntecedentes(fila.antecedentes) as Antecedentes,
  documento: parseDocumento(fila.documento),
  borradores: fila.borradores.map((borrador) => ({
    id: borrador.id,
    titulo: borrador.titulo,
    texto: borrador.texto,
    secciones: parseSecciones(borrador.secciones),
    estado: borrador.estado,
    plantilla: borrador.plantilla ?? null,
    generadoEn: borrador.generadoEn.toISOString(),
    confirmadoEn: borrador.confirmadoEn?.toISOString() ?? null,
  })),
});
