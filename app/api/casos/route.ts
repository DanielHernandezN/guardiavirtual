import { obtenerSesion } from "@/lib/auth-server";
import { tituloDeCaso, toCasoResumen } from "@/lib/casos";
import { prisma } from "@/lib/db";
import { esquemaAntecedentes } from "@/lib/schemas";
import type { BorradorParte } from "@/lib/types";

/**
 * Casos — endpoints de la colección.
 *
 * GET  → lista los casos del funcionario autenticado.
 * POST → guarda (o actualiza) un caso con sus antecedentes y, opcionalmente,
 *        un borrador del parte.
 */

export async function GET() {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const casos = await prisma.caso.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
    include: { borradores: { orderBy: { generadoEn: "desc" } } },
  });

  return Response.json({ casos: casos.map(toCasoResumen) });
}

export async function POST(request: Request) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const antecedentes = esquemaAntecedentes.parse(body?.antecedentes ?? {});
  const casoId = typeof body?.casoId === "string" ? body.casoId : null;
  const confirmar = body?.confirmar === true;
  const borrador = body?.borrador as Partial<BorradorParte> | undefined;

  const estado = confirmar ? "CONFIRMADO" : "BORRADOR";

  const datosCaso = {
    titulo: tituloDeCaso(antecedentes),
    tipoProcedimiento: antecedentes.tipoProcedimiento,
    especie: antecedentes.especie,
    lugar: antecedentes.lugar,
    fecha: antecedentes.fecha,
    estado,
    antecedentes: JSON.stringify(antecedentes),
  };

  // Solo se actualiza un caso que pertenezca al funcionario autenticado.
  const existente = casoId
    ? await prisma.caso.findFirst({
        where: { id: casoId, usuarioId: sesion.id },
      })
    : null;

  const caso = await prisma.$transaction(async (tx) => {
    const guardado = existente
      ? await tx.caso.update({ where: { id: existente.id }, data: datosCaso })
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
}
