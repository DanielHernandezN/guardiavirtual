import { camposFaltantes } from "@/lib/antecedentes";
import { obtenerSesion } from "@/lib/auth-server";
import { errorComoJson } from "@/lib/errores";
import { ERROR_SIN_CLAVE, hayClaveDeIA, llamarModeloJson } from "@/lib/ia";
import { registrarUso } from "@/lib/limites";
import {
  PROMPT_REDAR_PARTE,
  construirMensajeBorrador,
} from "@/lib/prompts";
import { SECCIONES_PARTE, tituloPorTipo } from "@/lib/plantillas";
import { esquemaAntecedentes, esquemaBorrador } from "@/lib/schemas";
import type { BorradorParte, SeccionBorrador } from "@/lib/types";
import { leerJsonLimitado } from "@/lib/validacion";

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

    // La redacción consume una llamada al modelo: comparte el límite con
    // `/api/chat` (misma cuota del proveedor).
    const limite = registrarUso(`ia:${sesion.id}`);
    if (!limite.permitido) {
      return Response.json(
        {
          ok: false,
          error: `Demasiadas solicitudes seguidas. Intente de nuevo en ${limite.reintentoEnSegundos} segundos.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limite.reintentoEnSegundos) },
        }
      );
    }

    const cuerpo = await leerJsonLimitado(request);
    if (!cuerpo.ok) {
      return Response.json(
        {
          ok: false,
          error:
            cuerpo.motivo === "tamaño"
              ? "La solicitud es demasiado grande."
              : "El cuerpo de la solicitud no es JSON válido.",
        },
        { status: cuerpo.motivo === "tamaño" ? 413 : 400 }
      );
    }

    const datos = cuerpo.datos as Record<string, unknown>;
    const antecedentesEntrada =
      datos?.antecedentes &&
      typeof datos.antecedentes === "object" &&
      !Array.isArray(datos.antecedentes)
        ? (datos.antecedentes as Record<string, unknown>)
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

    // Las contradicciones bloquean el borrador: no se puede redactar un
    // parte que mezcle dos procedimientos distintos.
    if (antecedentes.contradicciones.length > 0) {
      return Response.json(
        {
          ok: false,
          error:
            "Hay contradicciones en los antecedentes: no se puede confeccionar un parte con dos procedimientos distintos.",
          contradicciones: antecedentes.contradicciones,
        },
        { status: 409 }
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
    const { status, body } = errorComoJson(error);
    return Response.json({ ok: false, error: body.error }, { status });
  }
}
