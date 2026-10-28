import {
  combinarAntecedentes,
  crearAntecedentesVacios,
} from "../antecedentes";
import { fechaDeHoy } from "../fecha";
import { llamarModeloJson } from "../ia";
import {
  PROMPT_EXTRAER_ANTECEDENTES,
  construirMensajeUsuario,
} from "../prompts";
import { esquemaRespuestaModelo } from "../schemas";
import { dividirEnTrozos } from "../trozos";
import type { Antecedentes } from "../types";

/**
 * Extracción de antecedentes — Guardia Virtual
 * ────────────────────────────────────────────
 * Envía el texto del documento al modelo por trozos, acumulando el resultado
 * con las mismas reglas que el chat (`combinarAntecedentes`). No completa
 * datos ausentes ni corrige valores: la validación es una etapa aparte.
 */

/** Resultado de la extracción de un documento. */
export type ResultadoExtraccion = {
  antecedentes: Antecedentes;
  /** Cantidad de trozos enviados al modelo. */
  trozos: number;
  /** `true` si el documento describe otro procedimiento y reinició el estado. */
  cambioDeProcedimiento: boolean;
};

/**
 * Extrae los antecedentes del texto de un documento.
 *
 * @param texto Texto ya extraído del archivo de origen.
 * @param ahora Fecha de referencia (se inyecta en pruebas).
 */
export const extraerAntecedentesDeTexto = async (
  texto: string,
  ahora: Date = new Date()
): Promise<ResultadoExtraccion> => {
  const trozos = dividirEnTrozos(texto);
  const hoy = fechaDeHoy(ahora);

  let antecedentes: Antecedentes = crearAntecedentesVacios();
  let cambioDeProcedimiento = false;

  for (const [indice, trozo] of trozos.entries()) {
    const validados = esquemaRespuestaModelo.parse(
      await llamarModeloJson(
        [
          { role: "system", content: PROMPT_EXTRAER_ANTECEDENTES },
          {
            role: "user",
            content: construirMensajeUsuario(antecedentes, trozo, hoy),
          },
        ],
        // Un acta extensa puede requerir varios trozos: se da margen amplio
        // por trozo, igual que en el chat.
        { timeoutMs: 90_000, intentos: 2 }
      )
    );

    const reiniciar = indice === 0 && validados.cambioDeProcedimiento;

    if (indice === 0) {
      cambioDeProcedimiento = validados.cambioDeProcedimiento;
    }

    antecedentes = combinarAntecedentes(antecedentes, validados, reiniciar);
  }

  return { antecedentes, trozos: trozos.length, cambioDeProcedimiento };
};
