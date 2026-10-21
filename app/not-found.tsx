import Link from "next/link";

/** Página 404: la ruta solicitada no existe. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-oliva-50 p-6 text-center">
      <h1 className="text-3xl font-semibold text-oliva-900">404</h1>
      <p className="max-w-md text-sm text-oliva-600">
        La página solicitada no existe. Utilice el acceso al sistema para
        volver al dashboard.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-50 transition hover:bg-oliva-700"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
