import LoginForm from "./components/LoginForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6 py-10">
      
      <section className="w-full max-w-md">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          
          {/* Logo IA */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <span className="text-4xl">◉</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-ink">
            Cabo Virtual
          </h1>

          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-500">
            Sistema de apoyo para la gestión policial
          </p>
        </div>

        {/* Tarjeta Login */}
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50">
          
          <h2 className="mb-6 text-center text-2xl font-semibold text-ink-soft">
            Iniciar sesión
          </h2>

          <LoginForm />

          
        </div>

        {/* Pie */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Sistema de apoyo documental
        </p>

      </section>
    </main>
  );
}