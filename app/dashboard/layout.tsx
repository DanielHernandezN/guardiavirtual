import { obtenerSesion } from "@/lib/auth-server";
import { redirect } from "next/navigation";

/**
 * Layout del dashboard — exige una sesión válida.
 * Si el funcionario no está autenticado, se lo manda al login.
 */
export default async function DashboardLayout(
  props: LayoutProps<"/dashboard">
) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    redirect("/");
  }

  return <>{props.children}</>;
}
