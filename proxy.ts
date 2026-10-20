import { NextResponse, type NextRequest } from "next/server";
import { SESION_COOKIE, verificarTokenSesion } from "@/lib/sesion";

/**
 * Proxy — Guardia Virtual
 * ───────────────────────
 * Barrera de red: bloquea el acceso a `/dashboard` y a los endpoints de IA
 * cuando no hay una sesión válida.
 *
 * `/api/auth/*` queda público (login y logout deben poder usarse sin sesión).
 *
 * La verificación real se repite en cada endpoint y en el layout del
 * dashboard: nunca se depende solo del proxy.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const esApiProtegida =
    pathname.startsWith("/api") && !pathname.startsWith("/api/auth");
  const esDashboard = pathname.startsWith("/dashboard");

  if (!esApiProtegida && !esDashboard) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESION_COOKIE)?.value;

  if (verificarTokenSesion(token)) {
    return NextResponse.next();
  }

  if (esApiProtegida) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
