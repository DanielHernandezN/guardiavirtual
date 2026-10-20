import { obtenerSesion } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import Chat from "../components/chat";
import LogoutButton from "../components/LogoutButton";

export default async function Dashboard() {
  const sesion = await obtenerSesion();

  // El layout ya redirige, pero se mantiene la comprobación como red de
  // seguridad en caso de que se renderice la página sin el layout.
  if (!sesion) {
    redirect("/");
  }

  return (
    <main className="
    flex 
    flex-row
    max-w-full
    min-h-screen">

      <section className="
      w-[20%]
      flex
      flex-col
      p-6
      gap-8
      bg-surface-alt
      ">
        <div className="
        flex
        flex-col
        gap-4
        ">
            <h2>CABO VIRTUAL</h2>
            <h3>FUNCIONARIO</h3>
            <p className="font-semibold text-ink">{sesion.nombre}</p>
            <p className="text-sm text-slate-600">{sesion.id}</p>
            <LogoutButton />
        </div>

        <div className="
        flex
        flex-col
        gap-2
        ">
            <h2>AGENTES</h2>
                <p>Agente 1</p>
                <p>Agente 2</p>
                <p>Agente 3</p> 
        </div>
      </section>
      
      <Chat />

    </main>
  );
}
