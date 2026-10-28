import type { Antecedentes } from "../types";
import { recorrerValores } from "./mapeo";
import type { Observacion, Trazabilidad } from "./tipos";

/**
 * Trazabilidad — Guardia Virtual
 * ──────────────────────────────
 * Relaciona cada antecedente con el extracto del documento de origen donde
 * aparece. La comprobación es textual y determinística: si el dato no se
 * localiza literalmente, queda marcado como «dudoso» para revisión.
 *
 * No se inventa una confianza: el proveedor de IA configurado no entrega una
 * estimación calibrada y `confianza` queda en `null`.
 */

/** Texto normalizado y mapa de posiciones hacia el texto original. */
const normalizarConMapa = (
  texto: string
): { normalizado: string; mapa: number[] } => {
  let normalizado = "";
  const mapa: number[] = [];

  for (let indice = 0; indice < texto.length; indice++) {
    const caracter = texto[indice];

    if (/\s/.test(caracter)) {
      if (normalizado && !normalizado.endsWith(" ")) {
        normalizado += " ";
        mapa.push(indice);
      }
      continue;
    }

    const descompuesto = caracter
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    for (const letra of descompuesto) {
      normalizado += letra;
      mapa.push(indice);
    }
  }

  mapa.push(texto.length);
  return { normalizado, mapa };
};

/** Normaliza un valor para buscarlo en el documento. */
export const normalizarParaBusqueda = (texto: string): string =>
  normalizarConMapa(texto).normalizado.trim();

/** Extracto del documento donde aparece un valor, o `null` si no se localiza. */
export const buscarExtracto = (
  texto: string,
  valor: string,
  margen = 70
): string | null => {
  const { normalizado, mapa } = normalizarConMapa(texto);
  const buscado = normalizarParaBusqueda(valor);

  if (!buscado) return null;

  // Para valores largos basta con localizar el comienzo: el texto completo
  // puede venir reformateado por el modelo.
  const aguja = buscado.length > 90 ? buscado.slice(0, 90) : buscado;
  const posicion = normalizado.indexOf(aguja);

  if (posicion === -1) return null;

  const inicioNormalizado = Math.max(0, posicion - margen);
  const finNormalizado = Math.min(
    normalizado.length,
    posicion + aguja.length + margen
  );

  const inicio = mapa[inicioNormalizado] ?? 0;
  const fin = mapa[finNormalizado] ?? texto.length;

  return texto
    .slice(inicio, fin)
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Construye la trazabilidad de todos los antecedentes con contenido.
 * Las observaciones de validación se asocian al campo que las origina.
 */
export const construirTrazabilidad = (
  antecedentes: Antecedentes,
  textoFuente: string,
  observaciones: readonly Observacion[] = []
): Trazabilidad => {
  const campos: Trazabilidad["campos"] = {};

  for (const { ruta, valor } of recorrerValores(antecedentes)) {
    const extracto = buscarExtracto(textoFuente, valor);
    const notas = observaciones
      .filter(
        (observacion) =>
          observacion.campo === ruta ||
          observacion.campo.replace(/\[\d+\]/g, "[]") ===
            ruta.replace(/\[\d+\]/g, "[]") ||
          observacion.campo === ruta.replace(/\[\d+\]/g, "")
      )
      .map((observacion) => observacion.mensaje);

    campos[ruta] = {
      estado: extracto ? "extraido" : "dudoso",
      confianza: null,
      fuente: extracto,
      observaciones: [
        ...notas,
        ...(extracto
          ? []
          : [
              "El dato no se localizó literalmente en el documento: puede ser una síntesis del modelo. Verifícalo antes de firmar.",
            ]),
      ],
    };
  }

  // Campos obligatorios vacíos: se registran como faltantes.
  for (const ruta of [
    "tipoProcedimiento",
    "lugar",
    "fecha",
    "descripcionHechos",
  ]) {
    if (!campos[ruta]) {
      campos[ruta] = {
        estado: "faltante",
        confianza: null,
        fuente: null,
        observaciones: ["El documento no informa este antecedente."],
      };
    }
  }

  return { campos };
};

/** Cuenta los campos dudosos (no localizados literalmente en la fuente). */
export const contarDudosos = (trazabilidad: Trazabilidad): number =>
  Object.values(trazabilidad.campos).filter(
    (campo) => campo.estado === "dudoso"
  ).length;
