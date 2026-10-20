import { camposFaltantes } from "@/lib/antecedentes";
import { parseModelContent } from "@/lib/parse";
import {
  PROMPT_REDAR_PARTE,
  construirMensajeBorrador,
} from "@/lib/prompts";
import { SECCIONES_PARTE, tituloPorTipo } from "@/lib/plantillas";
import { esquemaAntecedentes, esquemaBorrador } from "@/lib/schemas";
import type { BorradorParte, SeccionBorrador } from "@/lib/types";

/** Concatena el título y las secciones en un texto plano legible. */
const construirTextoCompleto = (
  titulo: string,
  secciones: SeccionBorrador[]
): string => {
  const cuerpo = secciones
    .map((seccion) => `${seccion.titulo}\n${seccion.contenido}`)
    .join("\n\n");

  return `${titulo}\n\n${cuerpo}`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const antecedentesEntrada =
      body?.antecedentes &&
      typeof body.antecedentes === "object" &&
      !Array.isArray(body.antecedentes)
        ? (body.antecedentes as Record<string, unknown>)
        : {};

    const antecedentes = esquemaAntecedentes.parse(antecedentesEntrada);

    // Solo se confecciona el borrador si están todos los campos obligatorios.
    const faltantes = camposFaltantes(antecedentes);
    if (faltantes.length > 0) {
      return Response.json(
        {
          ok: false,
          error:
            "Faltan antecedentes obligatorios para confeccionar el borrador.",
          faltantes,
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          ok: false,
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
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: PROMPT_REDAR_PARTE },
            {
              role: "user",
              content: construirMensajeBorrador(antecedentes, SECCIONES_PARTE),
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

    const validados = esquemaBorrador.parse(parseModelContent(content));
    const titulo = tituloPorTipo(antecedentes.tipoProcedimiento);

    const borrador: BorradorParte = {
      titulo,
      secciones: validados.secciones,
      textoCompleto: construirTextoCompleto(titulo, validados.secciones),
      generadoEn: new Date().toISOString(),
    };

    return Response.json({ ok: true, borrador });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al generar el borrador.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
