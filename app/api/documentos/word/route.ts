import { z } from "zod";
import { obtenerSesion } from "@/lib/auth-server";
import {
  generarDocumentoWord,
  nombreArchivoWord,
} from "@/lib/documentos/docx";
import { obtenerPlantilla } from "@/lib/documentos/plantillas";
import { errorComoJson } from "@/lib/errores";
import { registrarUso } from "@/lib/limites";
import { leerJsonLimitado } from "@/lib/validacion";

/**
 * POST /api/documentos/word — Guardia Virtual
 * ────────────────────────────────────────────
 * Genera el archivo .docx a partir del borrador ya revisado por el
 * funcionario. No llama a la IA ni agrega contenido: solo aplica el formato
 * institucional de la plantilla.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const esquemaWord = z.object({
  titulo: z.string().trim().min(1).max(200),
  plantillaId: z.string().trim().max(64).optional().nullable(),
  secciones: z
    .array(
      z.object({
        titulo: z.string().trim().min(1).max(500),
        contenido: z.string().max(50_000),
      })
    )
    .min(1)
    .max(60),
});

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) {
      return Response.json(
        { ok: false, error: "No autenticado." },
        { status: 401 }
      );
    }

    const limite = registrarUso(`word:${sesion.id}`);
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

    const cuerpo = await leerJsonLimitado(request, { maximo: 1_000_000 });
    if (!cuerpo.ok) {
      return Response.json(
        {
          ok: false,
          error:
            cuerpo.motivo === "tamaño"
              ? "El documento es demasiado grande."
              : "El cuerpo de la solicitud no es JSON válido.",
        },
        { status: cuerpo.motivo === "tamaño" ? 413 : 400 }
      );
    }

    const validado = esquemaWord.safeParse(cuerpo.datos);
    if (!validado.success) {
      return Response.json(
        { ok: false, error: "El borrador no tiene una estructura válida." },
        { status: 400 }
      );
    }

    const { titulo, secciones, plantillaId } = validado.data;
    const plantilla = obtenerPlantilla(plantillaId);

    const archivo = await generarDocumentoWord({
      titulo,
      secciones,
      formato: plantilla?.formato,
    });

    return new Response(new Uint8Array(archivo), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nombreArchivoWord(
          titulo
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const { status, body } = errorComoJson(error);
    return Response.json({ ok: false, error: body.error }, { status });
  }
}
