import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { obtenerSesion } from "@/lib/auth-server";
import { buscarUsuario } from "@/lib/usuarios-db";
import UsuariosPanel from "../../components/UsuariosPanel";

export const metadata: Metadata = {
  title: "Funcionarios — Guardia Virtual",
};

/**
 * Administración de funcionarios.
 *
 * Solo entra un administrador **activo**: el rol se vuelve a consultar en la
 * base de datos (no se confía solo en la cookie), así que rebajar o desactivar
 * a un administrador tiene efecto inmediato.
 */
export default async function UsuariosPage() {
  const sesion = await obtenerSesion();

  if (!sesion) {
    redirect("/");
  }

  const usuario = await buscarUsuario(sesion.id).catch(() => null);

  if (!usuario || !usuario.activo || usuario.rol !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh bg-oliva-100 px-4 py-6 sm:px-6 lg:px-10">
      <UsuariosPanel nombre={usuario.nombre} usuarioId={usuario.id} />
    </main>
  );
}
