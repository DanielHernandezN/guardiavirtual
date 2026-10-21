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
    min-h-screen
    bg-oliva-100
    ">

      <section className="
      w-[20%]
      flex
      flex-col
      p-6
      gap-8
      bg-oliva-900
      text-oliva-100
      ">
        <div className="
        flex
        flex-col
        gap-4
        ">
            <h2 className="text-oliva-50">CABO VIRTUAL</h2>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-oliva-400">
              Funcionario
            </h3>
            <p className="font-semibold text-oliva-100">{sesion.nombre}</p>
            <p className="text-sm text-oliva-300">{sesion.id}</p>
            <LogoutButton />
        </div>

        <div className="
        flex
        flex-col
        gap-2
        ">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-oliva-400">
              Agentes
            </h3>
                <p className="text-sm text-oliva-200">Agente 1</p>
                <p className="text-sm text-oliva-200">Agente 2</p>
                <p className="text-sm text-oliva-200">Agente 3</p> 
        </div>
      </section>
      
      <Chat />

    </main>
  );
}
