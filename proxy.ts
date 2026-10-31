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
 * La administración de funcionarios (`/dashboard/usuarios` y `/api/usuarios`)
 * exige además rol `ADMIN`. Es una primera barrera: el layout de la página y
 * los endpoints vuelven a comprobar el rol contra la base de datos.
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
  const sesion = verificarTokenSesion(token);

  if (!sesion) {
    if (esApiProtegida) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  // Administración de funcionarios: solo administradores.
  const esAdminSolo =
    pathname.startsWith("/dashboard/usuarios") ||
    pathname.startsWith("/api/usuarios");

  if (esAdminSolo && sesion.rol !== "ADMIN") {
    if (esApiProtegida) {
      return Response.json(
        { error: "Solo un administrador puede gestionar funcionarios." },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
