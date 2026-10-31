import { obtenerSesion } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import DashboardWorkspace from "../components/DashboardWorkspace";

export default async function Dashboard() {
  const sesion = await obtenerSesion();

  // El layout ya redirige, pero se mantiene la comprobación como red de
  // seguridad en caso de que se renderice la página sin el layout.
  if (!sesion) {
    redirect("/");
  }

  return (
    <main className="flex h-dvh max-w-full flex-col overflow-hidden bg-oliva-100 lg:flex-row">
      <DashboardWorkspace
        nombre={sesion.nombre}
        esAdmin={sesion.rol === "ADMIN"}
      />
    </main>
  );
}
