import { camposFaltantes, crearRespuestaConversacional } from "@/lib/antecedentes";
import { obtenerSesion } from "@/lib/auth-server";
import { parseModelContent } from "@/lib/parse";
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

    const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error:
            "Falta OPENROUTER_API_KEY o OPENAI_API_KEY en las variables de entorno.",
        },
        { status: 500 }
      );
    }

    const model =
      process.env.OPENROUTER_MODEL ??
      process.env.OPENAI_MODEL ??
      "openai/gpt-4o-mini";

    // Normaliza y valida los antecedentes acumulados que envía el cliente.
    const antecedentesPrevios = esquemaAntecedentes.parse(antecedentesEntrada);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Guardiavirtual",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: PROMPT_EXTRAER_ANTECEDENTES },
            {
              role: "user",
              content: construirMensajeUsuario(antecedentesPrevios, mensaje),
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`La API de IA falló: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("La respuesta de la API no incluye contenido válido.");
    }

    const objeto = parseModelContent(content);
    const validados = esquemaAntecedentes.parse(objeto);

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
