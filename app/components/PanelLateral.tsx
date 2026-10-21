"use client";

import LogoutButton from "./LogoutButton";
import type { CasoResumen } from "@/lib/casos";

type Props = {
  nombre: string;
  usuarioId: string;
  casos: CasoResumen[];
  casoActivoId: string | null;
  mensajeEstado: string;
  onAbrirCaso: (caso: CasoResumen) => void;
  onNuevoCaso: () => void;
};

/**
 * Panel lateral del dashboard: datos del funcionario en sesión, botón de
 * cierre de sesión e historial de casos guardados.
 */
export default function PanelLateral({
  nombre,
  usuarioId,
  casos,
  casoActivoId,
  mensajeEstado,
  onAbrirCaso,
  onNuevoCaso,
}: Props) {
  return (
    <section className="
      w-[20%]
      flex
      flex-col
      p-6
      gap-8
      bg-oliva-900
      text-oliva-100
      ">
      <div className="flex flex-col gap-4">
        <h2 className="text-oliva-50">CABO VIRTUAL</h2>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-oliva-400">
          Funcionario
        </h3>
        <p className="font-semibold text-oliva-100">{nombre}</p>
        <p className="text-sm text-oliva-300">{usuarioId}</p>
        <LogoutButton />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-oliva-400">
            Casos
          </h3>
          <button
            type="button"
            onClick={onNuevoCaso}
            className="rounded-lg border border-oliva-400 px-2.5 py-1 text-xs font-semibold text-oliva-200 transition hover:bg-oliva-400 hover:text-oliva-950"
          >
            + Nuevo
          </button>
        </div>

        {casos.length === 0 ? (
          <p className="text-sm text-oliva-300">
            Todavía no hay casos guardados. Confirma un borrador para crear el
            primero.
          </p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {casos.map((caso) => {
              const activo = caso.id === casoActivoId;

              return (
                <li key={caso.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirCaso(caso)}
                    className={
                      activo
                        ? "w-full rounded-xl border border-oliva-400 bg-oliva-800 px-3 py-2 text-left transition"
                        : "w-full rounded-xl border border-oliva-700 bg-oliva-950/40 px-3 py-2 text-left transition hover:border-oliva-400 hover:bg-oliva-800"
                    }
                  >
                    <p className="text-sm font-semibold text-oliva-50">
                      {caso.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-oliva-300">
                      {caso.fecha ?? "sin fecha"} ·{" "}
                      {caso.estado === "CONFIRMADO"
                        ? "Confirmado"
                        : "En borrador"}
                      {caso.borradores.length > 0
                        ? ` · ${caso.borradores.length} borrador${caso.borradores.length > 1 ? "es" : ""}`
                        : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {mensajeEstado && (
        <p className="text-xs leading-relaxed text-oliva-300">{mensajeEstado}</p>
      )}
    </section>
  );
}
