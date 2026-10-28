import {
  TITULO_ENCABEZADO,
  TITULO_INSTRUCCIONES,
  TITULO_PIE,
  TITULO_SITUACION,
} from "../plantillas";
import type { Antecedentes } from "../types";
import type { DefinicionPlantilla } from "./tipos";
import { ETIQUETAS_CAMPO } from "./validacion";

/**
 * Mapeo de antecedentes a la plantilla — Guardia Virtual
 * ──────────────────────────────────────────────────────
 * Relaciona cada antecedente con la sección de destino y detecta información
 * relevante que no tiene un lugar definido en la plantilla.
 *
 * El orden del documento lo impone la plantilla, no el modelo.
 */

/** Valor hoja con su ruta concreta (`vehiculos[0].patente`). */
export type ValorAntecedente = {
  ruta: string;
  /** Ruta sin índices, la que se usa en el mapeo (`vehiculos[].patente`). */
  rutaBase: string;
  valor: string;
  etiqueta: string;
};

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

/**
 * Campos de control del motor: describen el estado del análisis, no el
 * contenido del procedimiento. No se mapean ni se buscan en el acta.
 */
const CAMPOS_DE_CONTROL = new Set(["contradicciones"]);

/**
 * Recorre los antecedentes y devuelve los valores con contenido.
 * Los arreglos vacíos se devuelven como valor vacío para poder informarlos.
 */
export const recorrerValores = (
  datos: Antecedentes,
  prefijo = ""
): ValorAntecedente[] => {
  const resultado: ValorAntecedente[] = [];

  const visitar = (
    valor: unknown,
    ruta: string,
    rutaBase: string
  ): void => {
    if (valor === null || valor === undefined) return;
    if (CAMPOS_DE_CONTROL.has(rutaBase.replace(/\[\]/g, ""))) return;

    if (Array.isArray(valor)) {
      if (valor.length === 0) return;

      valor.forEach((item, indice) => {
        visitar(item, `${ruta}[${indice}]`, `${rutaBase}[]`);
      });
      return;
    }

    if (esObjeto(valor)) {
      for (const [clave, hijo] of Object.entries(valor)) {
        visitar(
          hijo,
          ruta ? `${ruta}.${clave}` : clave,
          rutaBase ? `${rutaBase}.${clave}` : clave
        );
      }
      return;
    }

    if (typeof valor === "string" && valor.trim()) {
      resultado.push({
        ruta,
        rutaBase: rutaBase || ruta,
        valor: valor.trim(),
        etiqueta: ETIQUETAS_CAMPO[rutaBase] ?? rutaBase,
      });
    }
  };

  visitar(datos, prefijo, prefijo);
  return resultado;
};

/** Título de la sección de destino de una ruta de antecedente. */
export const seccionDestino = (
  plantilla: DefinicionPlantilla,
  rutaBase: string
): string | null => {
  if (plantilla.mapeo[rutaBase]) return plantilla.mapeo[rutaBase];

  // Un arreglo de textos (`pruebas.otras[]`) se mapea igual que su campo
  // contenedor (`pruebas.otras`).
  const sinIndices = rutaBase.replace(/\[\]/g, "");
  if (plantilla.mapeo[sinIndices]) return plantilla.mapeo[sinIndices];

  // Si no hay una entrada exacta, se busca la del contenedor:
  // `detenido.rut` → `detenido`, `vehiculos[0].patente` → `vehiculos`.
  const partes = rutaBase.split(".");
  for (let indice = partes.length - 1; indice > 0; indice--) {
    const contenedor = partes.slice(0, indice).join(".");
    if (plantilla.mapeo[contenedor]) return plantilla.mapeo[contenedor];
  }

  const contenedorArreglo = rutaBase.split("[]")[0];
  if (contenedorArreglo && plantilla.mapeo[contenedorArreglo]) {
    return plantilla.mapeo[contenedorArreglo];
  }

  return null;
};

/**
 * Antecedentes con contenido que no tienen sección de destino en la plantilla.
 * Se informan para revisión: no se descartan ni se fuerzan en otra sección.
 */
export const antecedentesSinDestino = (
  antecedentes: Antecedentes,
  plantilla: DefinicionPlantilla
): string[] =>
  recorrerValores(antecedentes)
    .filter(({ rutaBase }) => !seccionDestino(plantilla, rutaBase))
    .map(({ etiqueta, ruta }) => `${etiqueta} (${ruta})`);

/** Secciones de la plantilla, en su orden, más la situación del detenido. */
export const seccionesDePlantilla = (
  plantilla: DefinicionPlantilla,
  detencion: boolean
) => [
  ...plantilla.secciones,
  ...(detencion
    ? [
        {
          titulo: TITULO_SITUACION,
          instruccion:
            "Situación procesal del detenido, solo si consta en los antecedentes.",
        },
      ]
    : []),
];

/** Normaliza un título para compararlo (mayúsculas, sin tildes ni signos). */
const normalizarTitulo = (titulo: string): string =>
  titulo
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Ordena las secciones devueltas por el modelo según la plantilla.
 *
 * - Elimina encabezado, pie y secciones vacías.
 * - Descarta las secciones que arma el servidor con datos estructurados
 *   (instrucciones del fiscal y situación del detenido), para no duplicarlas.
 * - Quita duplicados (conserva el primero con contenido).
 * - Las secciones desconocidas se conservan al final, para no perder
 *   información, pero nunca alteran el orden definido.
 */
export const ordenarSecciones = <T extends { titulo: string; contenido: string }>(
  secciones: readonly T[],
  plantilla: DefinicionPlantilla
): T[] => {
  const orden = new Map<string, number>();

  plantilla.secciones.forEach((seccion, indice) =>
    orden.set(normalizarTitulo(seccion.titulo), indice)
  );
  orden.set(normalizarTitulo(TITULO_SITUACION), plantilla.secciones.length);

  const vistas = new Set<string>();
  const conocidas: Array<{ seccion: T; posicion: number; aparicion: number }> = [];
  const desconocidas: T[] = [];

  secciones.forEach((seccion, aparicion) => {
    const titulo = seccion.titulo.trim();
    const contenido = seccion.contenido.trim();

    if (
      !titulo ||
      !contenido ||
      titulo === TITULO_ENCABEZADO ||
      titulo === TITULO_PIE ||
      titulo === TITULO_INSTRUCCIONES ||
      titulo === TITULO_SITUACION
    ) {
      return;
    }

    const clave = normalizarTitulo(titulo);
    if (vistas.has(clave)) return;
    vistas.add(clave);

    const posicion = orden.get(clave);

    if (posicion === undefined) {
      desconocidas.push({ ...seccion, titulo, contenido });
    } else {
      conocidas.push({
        seccion: { ...seccion, titulo, contenido },
        posicion,
        aparicion,
      });
    }
  });

  conocidas.sort(
    (a, b) => a.posicion - b.posicion || a.aparicion - b.aparicion
  );

  return [...conocidas.map(({ seccion }) => seccion), ...desconocidas];
};
