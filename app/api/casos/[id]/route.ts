import { obtenerSesion } from "@/lib/auth-server";
import { toCasoResumen } from "@/lib/casos";
import { prisma } from "@/lib/db";

/**
 * Caso individual.
 *
 * GET    → devuelve el caso con todos sus borradores.
 * DELETE → mueve el caso a la papelera (borrado lógico). Con `?permanente=1`
 *          lo elimina de forma definitiva, junto con sus borradores.
 * PATCH  → restaura un caso desde la papelera (`{"accion":"restaurar"}`).
 */

/** Los ids de Prisma son `cuid`: letras, dígitos y guiones. */
const ES_ID_VALIDO = /^[a-z0-9-]{1,64}$/i;

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/casos/[id]">
) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!ES_ID_VALIDO.test(id)) {
    return Response.json({ error: "Caso no encontrado." }, { status: 404 });
  }

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
  request: Request,
  ctx: RouteContext<"/api/casos/[id]">
) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!ES_ID_VALIDO.test(id)) {
    return Response.json({ error: "Caso no encontrado." }, { status: 404 });
  }

  const caso = await prisma.caso.findFirst({
    where: { id, usuarioId: sesion.id },
  });

  if (!caso) {
    return Response.json({ error: "Caso no encontrado." }, { status: 404 });
  }

  const url = new URL(request.url);
  const permanente = url.searchParams.get("permanente") === "1";

  if (permanente) {
    // Borrado definitivo: se va también el historial de borradores.
    await prisma.caso.delete({ where: { id: caso.id } });
    return Response.json({ ok: true, eliminado: true });
  }

  // Papelera: el caso se conserva y se puede restaurar.
  await prisma.caso.update({
    where: { id: caso.id },
    data: { eliminadoEn: new Date() },
  });

  return Response.json({ ok: true, eliminado: false });
}

/** Restaura un caso desde la papelera. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/casos/[id]">
) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!ES_ID_VALIDO.test(id)) {
    return Response.json({ error: "Caso no encontrado." }, { status: 404 });
  }

  const cuerpo = await request.json().catch(() => ({}));
  const accion =
    typeof cuerpo?.accion === "string" ? cuerpo.accion.trim() : "";

  if (accion !== "restaurar") {
    return Response.json(
      { error: "Acción no soportada. Solo se admite \"restaurar\"." },
      { status: 400 }
    );
  }

  const caso = await prisma.caso.findFirst({
    where: { id, usuarioId: sesion.id },
  });

  if (!caso) {
    return Response.json({ error: "Caso no encontrado." }, { status: 404 });
  }

  const restaurado = await prisma.caso.update({
    where: { id: caso.id },
    data: { eliminadoEn: null },
    include: { borradores: { orderBy: { generadoEn: "desc" } } },
  });

  return Response.json({ caso: toCasoResumen(restaurado) });
}
