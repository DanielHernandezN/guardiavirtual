import { obtenerSesion } from "@/lib/auth-server";
import { buscarUsuario } from "@/lib/usuarios-db";
import { redirect } from "next/navigation";
import LogoutButton from "../components/LogoutButton";

/**
 * Layout del dashboard — exige una sesión válida y un funcionario activo.
 *
 * El estado se vuelve a consultar en la base de datos: si el administrador
 * desactiva a un funcionario, su sesión abierta deja de servir de inmediato
 * (no hay que esperar a que caduque la cookie).
 */
export default async function DashboardLayout(
  props: LayoutProps<"/dashboard">
) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    redirect("/");
  }

  const usuario = await buscarUsuario(sesion.id).catch(() => null);

  if (!usuario || !usuario.activo) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-oliva-100 px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-oliva-200 bg-oliva-950 p-6 text-center">
          <h1 className="text-lg font-semibold text-oliva-50">
            Acceso desactivado
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-oliva-300">
            Su acceso al sistema fue desactivado. Comuníquese con el
            administrador para que lo reactive.
          </p>
          <LogoutButton />
        </section>
      </main>
    );
  }

  return <>{props.children}</>;
}
