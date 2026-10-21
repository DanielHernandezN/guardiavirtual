import { camposFaltantes } from "@/lib/antecedentes";
import { obtenerSesion } from "@/lib/auth-server";
import { ERROR_SIN_CLAVE, hayClaveDeIA, llamarModeloJson } from "@/lib/ia";
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
    const sesion = await obtenerSesion();
    if (!sesion) {
      return Response.json({ ok: false, error: "No autenticado." }, { status: 401 });
    }

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

    if (!hayClaveDeIA()) {
      return Response.json(
        { ok: false, error: ERROR_SIN_CLAVE },
        { status: 500 }
      );
    }

    const validados = esquemaBorrador.parse(
      await llamarModeloJson(
        [
          { role: "system", content: PROMPT_REDAR_PARTE },
          {
            role: "user",
            content: construirMensajeBorrador(antecedentes, SECCIONES_PARTE),
          },
        ],
        { temperatura: 0.2 }
      )
    );
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
