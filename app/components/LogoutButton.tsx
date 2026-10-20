"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Cierra la sesión y vuelve al login. */
export default function LogoutButton() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  const cerrarSesion = async () => {
    setCargando(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setCargando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      disabled={cargando}
      className="mt-3 w-full rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-60"
    >
      {cargando ? "SALIENDO..." : "CERRAR SESIÓN"}
    </button>
  );
}
