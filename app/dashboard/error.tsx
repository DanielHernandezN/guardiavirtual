"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary del dashboard.
 *
 * Captura los errores no controlados que ocurren al renderizar el espacio de
 * trabajo y ofrece reintentar sin perder la sesión del funcionario.
 */
export default function ErrorDashboard({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] error no controlado:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-oliva-50 p-6 text-center">
      <h1 className="text-xl font-semibold text-oliva-900">
        Ocurrió un error en el dashboard
      </h1>
      <p className="max-w-md text-sm text-oliva-600">
        No se pudo mostrar el espacio de trabajo. Los casos guardados siguen
        intactos en la base de datos. Puede reintentar o volver a iniciar
        sesión.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-50 transition hover:bg-oliva-700"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
