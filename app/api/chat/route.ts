import { camposFaltantes, crearRespuestaConversacional } from "@/lib/antecedentes";
import { obtenerSesion } from "@/lib/auth-server";
import { ERROR_SIN_CLAVE, hayClaveDeIA, llamarModeloJson } from "@/lib/ia";
import { PROMPT_EXTRAER_ANTECEDENTES, construirMensajeUsuario } from "@/lib/prompts";
import { esquemaAntecedentes } from "@/lib/schemas";
import type { Antecedentes, ResultadoAnalisis } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim() : "";
    const antecedentesEntrada =
      body?.antecedentes &&
      typeof body.antecedentes === "object" &&
      !Array.isArray(body.antecedentes)
        ? (body.antecedentes as Record<string, unknown>)
        : {};

    if (!mensaje) {
      return Response.json(
        { error: "Se requiere un mensaje para analizar el caso." },
        { status: 400 }
      );
    }

    if (!hayClaveDeIA()) {
      return Response.json({ error: ERROR_SIN_CLAVE }, { status: 500 });
    }

    // Normaliza y valida los antecedentes acumulados que envía el cliente.
    const antecedentesPrevios = esquemaAntecedentes.parse(antecedentesEntrada);

    const validados = esquemaAntecedentes.parse(
      await llamarModeloJson([
        { role: "system", content: PROMPT_EXTRAER_ANTECEDENTES },
        {
          role: "user",
          content: construirMensajeUsuario(antecedentesPrevios, mensaje),
        },
      ])
    );

    // Combina el resultado del modelo con los antecedentes previos,
    // conservando los datos ya conocidos cuando el modelo devuelve null.
    const antecedentes: Antecedentes = {
      tipoProcedimiento:
        validados.tipoProcedimiento ?? antecedentesPrevios.tipoProcedimiento,
      especie: validados.especie ?? antecedentesPrevios.especie,
      lugar: validados.lugar ?? antecedentesPrevios.lugar,
      fecha: validados.fecha ?? antecedentesPrevios.fecha,
      descripcionHechos:
        validados.descripcionHechos ??
        antecedentesPrevios.descripcionHechos ??
        mensaje,
      contradicciones: validados.contradicciones,
    };

    const faltantes = camposFaltantes(antecedentes);

    const resultado: ResultadoAnalisis = {
      respuesta: crearRespuestaConversacional(faltantes),
      ...antecedentes,
      puedeConfeccionarBorrador: faltantes.length === 0,
      faltantes,
    };

    return Response.json(resultado);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el chat.";
    return Response.json({ error: message }, { status: 500 });
  }
}
