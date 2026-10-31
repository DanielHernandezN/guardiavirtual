import { obtenerSesion } from "@/lib/auth-server";
import { tituloDeCaso, toCasoResumen } from "@/lib/casos";
import { prisma } from "@/lib/db";
import { errorComoJson } from "@/lib/errores";
import { esquemaAntecedentes } from "@/lib/schemas";
import { buscarUsuario } from "@/lib/usuarios-db";
import { esquemaGuardarCaso, leerJsonLimitado } from "@/lib/validacion";

/**
 * Casos — endpoints de la colección.
 *
 * GET  → lista los casos del funcionario autenticado.
 *        Con `?papelera=1` devuelve los casos eliminados.
 * POST → guarda (o actualiza) un caso con sus antecedentes y, opcionalmente,
 *        un borrador del parte.
 */

export async function GET(request: Request) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  // Un funcionario desactivado pierde el acceso de inmediato, aunque su
  // cookie todavía no haya caducado.
  const autor = await buscarUsuario(sesion.id);

  if (!autor || !autor.activo) {
    return Response.json(
      { error: "El acceso de este funcionario está desactivado." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const soloPapelera = url.searchParams.get("papelera") === "1";

  const casos = await prisma.caso.findMany({
    where: {
      usuarioId: sesion.id,
      eliminadoEn: soloPapelera ? { not: null } : null,
    },
    orderBy: { createdAt: "desc" },
    include: { borradores: { orderBy: { generadoEn: "desc" } } },
  });

  return Response.json({ casos: casos.map(toCasoResumen) });
}

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion();

    if (!sesion) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const cuerpo = await leerJsonLimitado(request);
    if (!cuerpo.ok) {
      return Response.json(
        {
          error:
            cuerpo.motivo === "tamaño"
              ? "La solicitud es demasiado grande."
              : "El cuerpo de la solicitud no es JSON válido.",
        },
        { status: cuerpo.motivo === "tamaño" ? 413 : 400 }
      );
    }

    const validado = esquemaGuardarCaso.safeParse(cuerpo.datos ?? {});
    if (!validado.success) {
      return Response.json(
        {
          error:
            validado.error.issues[0]?.message ??
            "Los datos del caso no tienen el formato esperado.",
        },
        { status: 400 }
      );
    }

    const {
      casoId,
      confirmar,
      antecedentes: antecedentesCrudos,
      borrador,
      documento,
    } = validado.data;

    const antecedentes = esquemaAntecedentes.parse(antecedentesCrudos ?? {});

    const estado = confirmar ? "CONFIRMADO" : "BORRADOR";

    const datosCaso = {
      titulo: tituloDeCaso(antecedentes),
      tipoProcedimiento: antecedentes.tipoProcedimiento,
      especie: antecedentes.especie,
      lugar: antecedentes.lugar,
      fecha: antecedentes.fecha,
      estado,
      antecedentes: JSON.stringify(antecedentes),
      // La trazabilidad se guarda junto al caso para conservar la relación
      // entre el documento de origen y los antecedentes extraídos.
      ...(documento ? { documento: JSON.stringify(documento) } : {}),
    };

    // Un funcionario eliminado o desactivado no debe seguir guardando casos,
    // aunque su cookie todavía no haya caducado.
    const autor = await buscarUsuario(sesion.id);

    if (!autor || !autor.activo) {
      return Response.json(
        { error: "El acceso de este funcionario está desactivado." },
        { status: 403 }
      );
    }

    // Solo se actualiza un caso que pertenezca al funcionario autenticado.
    const existente = casoId
      ? await prisma.caso.findFirst({
          where: { id: casoId, usuarioId: sesion.id, eliminadoEn: null },
        })
      : null;

    const caso = await prisma.$transaction(async (tx) => {
      const guardado = existente
        ? await tx.caso.update({
            where: { id: existente.id },
            // Al guardar de nuevo, el caso vuelve a estar activo.
            data: { ...datosCaso, eliminadoEn: null },
          })
        : await tx.caso.create({
            data: { ...datosCaso, usuarioId: sesion.id },
          });

      if (borrador) {
        await tx.borrador.create({
          data: {
            casoId: guardado.id,
            titulo: borrador.titulo?.trim() || guardado.titulo,
            texto: borrador.textoCompleto ?? "",
            secciones: JSON.stringify(borrador.secciones ?? []),
            estado,
            plantilla: borrador.plantilla ?? null,
            confirmadoEn: confirmar ? new Date() : null,
          },
        });
      }

      return guardado;
    });

    const completo = await prisma.caso.findUnique({
      where: { id: caso.id },
      include: { borradores: { orderBy: { generadoEn: "desc" } } },
    });

    if (!completo) {
      return Response.json(
        { error: "No se pudo leer el caso guardado." },
        { status: 500 }
      );
    }

    return Response.json({ caso: toCasoResumen(completo) });
  } catch (error) {
    const { status, body } = errorComoJson(error);
    return Response.json(body, { status });
  }
}
