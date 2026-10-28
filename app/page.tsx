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
    <main className="flex min-h-dvh items-center justify-center bg-oliva-100 px-4 py-8 sm:px-6 sm:py-10">

      <section className="w-full max-w-md">

        {/* Encabezado */}
        <div className="mb-6 text-center sm:mb-8">

          {/* Logo IA */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-oliva-600/10 sm:h-20 sm:w-20">
            <span className="text-3xl text-oliva-600 sm:text-4xl">◉</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-oliva-900 sm:text-5xl">
            Guardia Virtual
          </h1>

          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-oliva-600">
            Sistema de apoyo para la gestión policial
          </p>
        </div>

        {/* Tarjeta Login */}
        <div className="rounded-2xl border border-oliva-200 bg-oliva-50 p-6 shadow-xl shadow-oliva-900/10 sm:p-8">

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