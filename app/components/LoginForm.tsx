"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!id || !password) {
      setMensaje("Debe ingresar ID y contraseña");
      return;
    }

    setCargando(true);
    setMensaje("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMensaje(data.error ?? "No se pudo iniciar sesión.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setMensaje("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">
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
            autoComplete="username"
            placeholder="Ingrese su ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="w-full rounded-xl border border-slate-500 px-4 py-3
            text-slate-900
            placeholder:text-slate-500 outline-none transition
            focus:border-accent focus:ring-2 
            focus:ring-accent/20"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingrese su contraseña"
            className="w-full rounded-xl border border-slate-500 px-4 py-3 
            text-slate-900
            placeholder:text-slate-500 outline-none transition 
            focus:border-accent focus:ring-2
            focus:ring-accent/20"
          />
        </div>

        {/* Botón */}
        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-xl 
          bg-brand px-4 py-3 font-semibold
          text-white transition
          hover:bg-brand-dark
          disabled:opacity-60"
        >
          {cargando ? "VERIFICANDO..." : "INGRESAR"}
        </button>

      </form>

      {mensaje && (
    <p className="mt-4 text-center text-sm text-slate-600">
        {mensaje}
    </p>
)}

    </div>
    )

}
