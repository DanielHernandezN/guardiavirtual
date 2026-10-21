import { obtenerSesion } from "@/lib/auth-server";
import { toCasoResumen } from "@/lib/casos";
import { prisma } from "@/lib/db";

/**
 * Caso individual — GET devuelve el caso con todos sus borradores.
 * DELETE elimina el caso y sus borradores.
 */

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/casos/[id]">
) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  const caso = await prisma.caso.findFirst({
    where: { id, usuarioId: sesion.id },
    include: { borradores: { orderBy: { generadoEn: "desc" } } },
  });

  if (!caso) {
    return Response.json({ error: "Caso no encontrado." }, { status: 404 });
  }

  return Response.json({ caso: toCasoResumen(caso) });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/casos/[id]">
) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  const caso = await prisma.caso.findFirst({
    where: { id, usuarioId: sesion.id },
  });

  if (!caso) {
    return Response.json({ error: "Caso no encontrado." }, { status: 404 });
  }

  await prisma.caso.delete({ where: { id: caso.id } });

  return Response.json({ ok: true });
}
