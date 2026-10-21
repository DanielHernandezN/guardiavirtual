import { obtenerSesion } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import LoginForm from "./components/LoginForm";

export default async function Home() {
  const sesion = await obtenerSesion();

  // Si ya hay sesión abierta, se salta el login.
  if (sesion) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-oliva-100 flex items-center justify-center px-6 py-10">

      <section className="w-full max-w-md">

        {/* Encabezado */}
        <div className="text-center mb-8">

          {/* Logo IA */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-oliva-600/10">
            <span className="text-4xl text-oliva-600">◉</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-oliva-900">
            Cabo Virtual
          </h1>

          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-oliva-600">
            Sistema de apoyo para la gestión policial
          </p>
        </div>

        {/* Tarjeta Login */}
        <div className="rounded-2xl border border-oliva-200 bg-oliva-50 p-8 shadow-xl shadow-oliva-900/10">

          <h2 className="mb-6 text-center text-2xl font-semibold text-oliva-800">
            Iniciar sesión
          </h2>

          <LoginForm />


        </div>

        {/* Pie */}
        <p className="mt-6 text-center text-xs text-oliva-500">
          Sistema de apoyo documental
        </p>

      </section>
    </main>
  );
}