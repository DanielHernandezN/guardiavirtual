export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f7f5] flex items-center justify-center px-6 py-10">
      
      <section className="w-full max-w-md">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          
          {/* Logo IA */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#c9654b]/10">
            <span className="text-4xl">◉</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-[#1d3557]">
            Cabo Virtual
          </h1>

          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-500">
            Sistema de apoyo para la gestión policial
          </p>
        </div>

        {/* Tarjeta Login */}
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/50">
          
          <h2 className="mb-6 text-center text-2xl font-semibold text-[#1d3557]">
            Iniciar sesión
          </h2>

          <form className="space-y-5">
            
            {/* ID */}
            <div>
              <label
                htmlFor="id"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                ID
              </label>

              <input
                id="id"
                type="text"
                placeholder="Ingrese su ID"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#c9654b] focus:ring-2 focus:ring-[#c9654b]/20"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                PASS
              </label>

              <input
                id="password"
                type="password"
                placeholder="Ingrese su contraseña"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#c9654b] focus:ring-2 focus:ring-[#c9654b]/20"
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              className="w-full rounded-xl bg-[#c9654b] px-4 py-3 font-semibold text-white transition hover:bg-[#b95740]"
            >
              INGRESAR
            </button>

          </form>
        </div>

        {/* Pie */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Sistema de apoyo documental
        </p>

      </section>
    </main>
  );
}