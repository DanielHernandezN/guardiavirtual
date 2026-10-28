import { ERROR_SIN_CLAVE, hayClaveDeIA } from "../ia";
import { extraerAntecedentesDeTexto } from "./extraccion";
import { extraerTextoDocumento, huellaArchivo } from "./ingesta";
import { antecedentesSinDestino } from "./mapeo";
import { elegirPlantilla, obtenerPlantilla } from "./plantillas";
import type {
  DocumentoProcesado,
  Observacion,
  OrigenDocumento,
  ResultadoIngesta,
} from "./tipos";
import { construirTrazabilidad } from "./trazabilidad";
import {
  faltantesDePlantilla,
  validarAntecedentes,
} from "./validacion";

/**
 * Flujo documental — Guardia Virtual
 * ──────────────────────────────────
 * Orquesta las etapas del módulo:
 *
 *   ingesta → extracción con IA → validación → mapeo a la plantilla → trazabilidad
 *
 * La redacción y la generación de Word ocurren después, cuando el funcionario
 * revisa los antecedentes (`/api/borrador` y `/api/documentos/word`).
 */

/** Error controlado del flujo documental. */
export type FalloProcesamiento = {
  ok: false;
  motivo: "ingesta" | "configuracion" | "extraccion";
  error: string;
  advertencias: string[];
};

/** Resultado correcto del flujo documental. */
export type ExitoProcesamiento = {
  ok: true;
  documento: DocumentoProcesado;
  /** Texto extraído del documento (solo para la sesión de revisión). */
  textoOriginal: string;
  ingesta: ResultadoIngesta & { ok: true };
};

export type ResultadoProcesamiento = ExitoProcesamiento | FalloProcesamiento;

/** Extrae los antecedentes; se reemplaza en pruebas con un doble controlado. */
export type ExtractorAntecedentes = typeof extraerAntecedentesDeTexto;

/**
 * Procesa un documento de origen y devuelve los antecedentes estructurados,
 * las observaciones y la trazabilidad.
 */
export const procesarDocumento = async ({
  nombre,
  bytes,
  plantillaId,
  ahora = new Date(),
  extraer = extraerAntecedentesDeTexto,
}: {
  nombre: string;
  bytes: Uint8Array;
  /** Identificador de plantilla elegido; `null` o `auto` la deduce. */
  plantillaId?: string | null;
  ahora?: Date;
  extraer?: ExtractorAntecedentes;
}): Promise<ResultadoProcesamiento> => {
  const ingesta = await extraerTextoDocumento({ nombre, bytes });

  if (!ingesta.ok) {
    return {
      ok: false,
      motivo: "ingesta",
      error: ingesta.error,
      advertencias: ingesta.advertencias,
    };
  }

  if (!hayClaveDeIA()) {
    return {
      ok: false,
      motivo: "configuracion",
      error: ERROR_SIN_CLAVE,
      advertencias: ingesta.advertencias,
    };
  }

  let antecedentes;
  let cambioDeProcedimiento = false;
  let trozos = 0;

  try {
    const extraccion = await extraer(ingesta.texto, ahora);
    antecedentes = extraccion.antecedentes;
    cambioDeProcedimiento = extraccion.cambioDeProcedimiento;
    trozos = extraccion.trozos;
  } catch (error) {
    return {
      ok: false,
      motivo: "extraccion",
      error:
        error instanceof Error
          ? `No se pudieron extraer los antecedentes: ${error.message}`
          : "No se pudieron extraer los antecedentes del documento.",
      advertencias: ingesta.advertencias,
    };
  }

  const plantilla =
    obtenerPlantilla(plantillaId) ?? elegirPlantilla(antecedentes);

  const observaciones: Observacion[] = validarAntecedentes(antecedentes, {
    hoy: ahora,
  });

  const faltantes = faltantesDePlantilla(antecedentes, plantilla);
  const sinDestino = antecedentesSinDestino(antecedentes, plantilla);

  const bloqueos: string[] = [];

  if (antecedentes.contradicciones.length > 0) {
    bloqueos.push(
      "Hay contradicciones entre los datos: no se puede generar el documento definitivo hasta resolverlas."
    );
  }

  if (faltantes.length > 0) {
    bloqueos.push(
      `Faltan antecedentes obligatorios de la plantilla: ${faltantes.join(", ")}.`
    );
  }

  if (cambioDeProcedimiento) {
    observaciones.push({
      nivel: "info",
      campo: "procedimiento",
      mensaje:
        "El documento parece describir un procedimiento distinto al estado previo: se reemplazaron los antecedentes anteriores.",
    });
  }

  if (trozos > 1) {
    observaciones.push({
      nivel: "info",
      campo: "documento",
      mensaje: `El documento se procesó en ${trozos} partes para no exceder el tamaño que el modelo analiza por vez.`,
    });
  }

  const trazabilidad = construirTrazabilidad(
    antecedentes,
    ingesta.texto,
    observaciones
  );

  const origen: OrigenDocumento = {
    nombre,
    tipo: ingesta.tipo,
    metodo: ingesta.metodo,
    caracteres: ingesta.caracteres,
    paginas: ingesta.paginas,
    hash: huellaArchivo(bytes),
    procesadoEn: ahora.toISOString(),
    advertencias: ingesta.advertencias,
  };

  const documento: DocumentoProcesado = {
    origen,
    plantilla: {
      id: plantilla.id,
      nombre: plantilla.nombre,
      version: plantilla.version,
    },
    antecedentes,
    trazabilidad,
    observaciones,
    faltantes,
    sinDestino,
    puedeRedactar: bloqueos.length === 0,
    bloqueos,
  };

  return {
    ok: true,
    documento,
    textoOriginal: ingesta.texto,
    ingesta,
  };
};
