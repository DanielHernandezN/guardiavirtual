import { TAMANO_MAXIMO_BYTES } from "@/lib/documentos/ingesta";
import { procesarDocumento } from "@/lib/documentos/flujo";
import { obtenerSesion } from "@/lib/auth-server";
import { errorComoJson } from "@/lib/errores";
import { registrarUso } from "@/lib/limites";

/**
 * POST /api/documentos/procesar — Guardia Virtual
 * ──────────────────────────────────────────────
 * Recibe un acta (TXT, DOCX o PDF con texto digital) y devuelve los
 * antecedentes extraídos, las observaciones de validación y la trazabilidad
 * hacia el documento de origen.
 *
 * No guarda nada: la revisión y el guardado ocurren en el flujo del caso.
 * El texto completo del documento no se devuelve al cliente; solo extractos
 * de respaldo por campo.
 *
 * Requiere sesión. La IA se invoca en el servidor: las credenciales nunca
 * llegan al navegador.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) {
      return Response.json(
        { ok: false, error: "No autenticado." },
        { status: 401 }
      );
    }

    const limite = registrarUso(`documentos:${sesion.id}`);
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

    const tipoContenido = request.headers.get("content-type") ?? "";
    if (!tipoContenido.toLowerCase().includes("multipart/form-data")) {
      return Response.json(
        {
          ok: false,
          error: "Envía el documento como formulario multipart.",
        },
        { status: 415 }
      );
    }

    const formulario = await request.formData();
    const archivo = formulario.get("archivo");

    if (!(archivo instanceof File) || !archivo.name) {
      return Response.json(
        { ok: false, error: "No se recibió ningún archivo." },
        { status: 400 }
      );
    }

    if (archivo.size === 0) {
      return Response.json(
        { ok: false, error: "El archivo está vacío." },
        { status: 400 }
      );
    }

    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      return Response.json(
        {
          ok: false,
          error: `El archivo supera el máximo de ${
            TAMANO_MAXIMO_BYTES / 1024 / 1024
          } MB.`,
        },
        { status: 413 }
      );
    }

    const plantillaId = formulario.get("plantillaId");
    const bytes = new Uint8Array(await archivo.arrayBuffer());

    const resultado = await procesarDocumento({
      nombre: archivo.name,
      bytes,
      plantillaId: typeof plantillaId === "string" ? plantillaId : null,
    });

    if (!resultado.ok) {
      const status =
        resultado.motivo === "ingesta"
          ? 422
          : resultado.motivo === "configuracion"
            ? 500
            : 502;

      return Response.json(
        {
          ok: false,
          error: resultado.error,
          advertencias: resultado.advertencias,
        },
        { status }
      );
    }

    return Response.json({
      ok: true,
      documento: resultado.documento,
      ingesta: {
        nombre: resultado.ingesta.nombre,
        tipo: resultado.ingesta.tipo,
        metodo: resultado.ingesta.metodo,
        caracteres: resultado.ingesta.caracteres,
        paginas: resultado.ingesta.paginas,
        advertencias: resultado.ingesta.advertencias,
      },
    });
  } catch (error) {
    const { status, body } = errorComoJson(error);
    return Response.json({ ok: false, error: body.error }, { status });
  }
}
