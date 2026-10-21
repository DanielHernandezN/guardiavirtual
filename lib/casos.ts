import type { Antecedentes, SeccionBorrador } from "./types";

/**
 * Casos — Guardia Virtual
 * ───────────────────────
 * Tipos y serialización de la capa de persistencia.
 * La base de datos guarda JSON como texto; este módulo lo convierte a
 * los tipos del dominio.
 */

export type BorradorGuardado = {
  id: string;
  titulo: string;
  texto: string;
  secciones: SeccionBorrador[];
  estado: string;
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
  antecedentes: Antecedentes;
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

/** Construye el título de un caso a partir de sus antecedentes. */
export const tituloDeCaso = (datos: {
  tipoProcedimiento?: string | null;
  especie?: string | null;
}): string => {
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
  borradores: Array<{
    id: string;
    titulo: string;
    texto: string;
    secciones: string;
    estado: string;
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
  antecedentes: parseAntecedentes(fila.antecedentes) as Antecedentes,
  borradores: fila.borradores.map((borrador) => ({
    id: borrador.id,
    titulo: borrador.titulo,
    texto: borrador.texto,
    secciones: parseSecciones(borrador.secciones),
    estado: borrador.estado,
    generadoEn: borrador.generadoEn.toISOString(),
    confirmadoEn: borrador.confirmadoEn?.toISOString() ?? null,
  })),
});
