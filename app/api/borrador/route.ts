import { camposFaltantes, esDetencion } from "@/lib/antecedentes";
import { obtenerSesion } from "@/lib/auth-server";
import { errorComoJson } from "@/lib/errores";
import { fechaYHoraDeHoy } from "@/lib/fecha";
import { ERROR_SIN_CLAVE, hayClaveDeIA, llamarModeloJson } from "@/lib/ia";
import { registrarUso } from "@/lib/limites";
import {
  PROMPT_REDAR_PARTE,
  construirMensajeBorrador,
} from "@/lib/prompts";
import {
  TITULO_ENCABEZADO,
  TITULO_PIE,
  componerTextoParte,
  construirEncabezadoParte,
  construirPieParte,
  seccionesPara,
  tituloPorTipo,
} from "@/lib/plantillas";
import { esquemaAntecedentes, esquemaBorrador } from "@/lib/schemas";
import type { BorradorParte, SeccionBorrador } from "@/lib/types";
import { leerJsonLimitado } from "@/lib/validacion";

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

    const detencion = esDetencion(antecedentes);
    const secciones = seccionesPara(detencion);
    const { fecha, hora } = fechaYHoraDeHoy();

    const validados = esquemaBorrador.parse(
      await llamarModeloJson(
        [
          { role: "system", content: PROMPT_REDAR_PARTE },
          {
            role: "user",
            content: construirMensajeBorrador(
              antecedentes,
              secciones,
              detencion,
              fecha
            ),
          },
        ],
        {
          temperatura: 0,
          modelo: process.env.AI_MODEL_REDACCION,
          timeoutMs: 60_000,
        }
      )
    );
    const titulo = tituloPorTipo(
      antecedentes.tipoProcedimiento,
      detencion
    );

    // Nombre con grado (si está configurado) para el encabezado y la firma.
    const funcionario = sesion.grado?.trim()
      ? `${sesion.grado.trim()} ${sesion.nombre}`
      : sesion.nombre;

    // El encabezado es fijo y lo arma el servidor (no el modelo): así la
    // unidad, la fecha, el funcionario y la materia no dependen de la IA.
    const encabezado: SeccionBorrador = {
      titulo: TITULO_ENCABEZADO,
      contenido: construirEncabezadoParte({
        unidad: process.env.UNIDAD_NOMBRE ?? null,
        fecha,
        hora,
        funcionario,
        materia:
          antecedentes.detencion.delito ?? antecedentes.tipoProcedimiento,
      }),
    };

    const seccionesBorrador = [
      encabezado,
      ...validados.secciones,
      {
        titulo: TITULO_PIE,
        contenido: construirPieParte({
          funcionario,
          unidad: process.env.UNIDAD_NOMBRE ?? null,
        }),
      } satisfies SeccionBorrador,
    ];

    const borrador: BorradorParte = {
      titulo,
      secciones: seccionesBorrador,
      textoCompleto: componerTextoParte(titulo, seccionesBorrador),
      generadoEn: new Date().toISOString(),
    };

    return Response.json({ ok: true, borrador });
  } catch (error) {
    const { status, body } = errorComoJson(error);
    return Response.json({ ok: false, error: body.error }, { status });
  }
}
