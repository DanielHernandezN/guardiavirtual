"use client";

import { useEffect } from "react";

/**
 * Error global de la aplicación.
 * Reemplaza el layout raíz cuando ocurre un error no controlado.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // El error se registra en la consola del navegador; la interfaz solo
  // muestra un mensaje genérico (no se filtran detalles técnicos).
  useEffect(() => {
    console.error("[app] error global:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-oliva-50 text-oliva-900">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold">
            Ocurrió un error inesperado
          </h1>
          <p className="max-w-md text-sm text-oliva-600">
            La aplicación no pudo continuar. Intente nuevamente; si el problema
            persiste, contacte al responsable del sistema.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-xl bg-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-50 transition hover:bg-oliva-700"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
