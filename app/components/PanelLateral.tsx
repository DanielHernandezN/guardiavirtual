"use client";

import { useEffect, useMemo, useState } from "react";
import LogoutButton from "./LogoutButton";
import type { CasoResumen } from "@/lib/casos";

type Props = {
  nombre: string;
  casos: CasoResumen[];
  casoActivoId: string | null;
  mensajeEstado: string;
  /** En móvil y tablet el panel es un menú deslizable. */
  abierto: boolean;
  onCerrar: () => void;
  onAbrirCaso: (caso: CasoResumen) => void;
  onNuevoCaso: () => void;
  onEliminarCaso: (caso: CasoResumen) => void;
  onRestaurarCaso: (caso: CasoResumen) => void;
  onVaciarPapelera: () => void;
};

type Filtro = "TODOS" | "BORRADOR" | "PAPELERA";

const FILTROS: Array<{ id: Filtro; etiqueta: string }> = [
  { id: "TODOS", etiqueta: "Todos" },
  { id: "BORRADOR", etiqueta: "En borrador" },
  { id: "PAPELERA", etiqueta: "Papelera" },
];

/**
 * Panel lateral del dashboard: datos del funcionario en sesión, historial de
 * casos guardados y, al pie, el cierre de sesión.
 */
export default function PanelLateral({
  nombre,
  casos,
  casoActivoId,
  mensajeEstado,
  abierto,
  onCerrar,
  onAbrirCaso,
  onNuevoCaso,
  onEliminarCaso,
  onRestaurarCaso,
  onVaciarPapelera,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [busqueda, setBusqueda] = useState("");

  // En móvil, Escape cierra el menú deslizable.
  useEffect(() => {
    if (!abierto) return;

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };

    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto, onCerrar]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return casos.filter((caso) => {
      const enPapelera = caso.enPapelera;

      const coincideEstado =
        filtro === "TODOS"
          ? true
          : filtro === "PAPELERA"
          ? enPapelera
          : !enPapelera && caso.estado === filtro;

      const coincideTexto =
        !texto ||
        caso.titulo.toLowerCase().includes(texto) ||
        (caso.lugar?.toLowerCase().includes(texto) ?? false) ||
        (caso.especie?.toLowerCase().includes(texto) ?? false) ||
        (caso.tipoProcedimiento?.toLowerCase().includes(texto) ?? false);

      return coincideEstado && coincideTexto;
    });
  }, [casos, filtro, busqueda]);

  const enPapelera = casos.filter((caso) => caso.enPapelera).length;

  return (
    <>
      {/* Velo del menú en móvil y tablet */}
      <div
        aria-hidden="true"
        onClick={onCerrar}
        className={`fixed inset-0 z-30 bg-oliva-950/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <section
        id="panel-casos"
        className={`fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-xs flex-col gap-4 overflow-hidden bg-oliva-900 p-5 text-oliva-100 shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:h-full lg:w-72 lg:max-w-none lg:translate-x-0 lg:gap-6 lg:p-6 lg:shadow-none xl:w-80 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar menú"
          className="absolute right-2 top-2 rounded-lg p-2 text-oliva-300 transition hover:bg-oliva-800 hover:text-oliva-50 lg:hidden"
        >
          ✕
        </button>

        <div className="flex flex-col gap-1 pr-8 lg:pr-0">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-oliva-400">
            Funcionario
          </h3>
          <p className="font-semibold text-oliva-100">{nombre}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-oliva-400">
              Casos
              <span className="ml-2 font-normal normal-case text-oliva-500">
                {casos.length - enPapelera} total
                {enPapelera > 0 ? ` · ${enPapelera} en papelera` : ""}
              </span>
            </h3>
            <button
              type="button"
              onClick={onNuevoCaso}
              className="shrink-0 whitespace-nowrap rounded-lg border border-oliva-400 px-3 py-2 text-sm font-semibold text-oliva-200 transition hover:bg-oliva-400 hover:text-oliva-950 sm:px-2.5 sm:py-1 sm:text-xs"
            >
              + Nuevo
            </button>
          </div>

          {/* Filtros por estado */}
          <div className="flex flex-wrap gap-1.5">
            {FILTROS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFiltro(item.id)}
                className={
                  filtro === item.id
                    ? "rounded-lg bg-oliva-500 px-3 py-1.5 text-sm font-semibold text-oliva-950 sm:px-2.5 sm:py-1 sm:text-xs"
                    : "rounded-lg border border-oliva-700 px-3 py-1.5 text-sm text-oliva-300 transition hover:border-oliva-400 hover:text-oliva-100 sm:px-2.5 sm:py-1 sm:text-xs"
                }
              >
                {item.etiqueta}
              </button>
            ))}
          </div>

          {filtro === "PAPELERA" && enPapelera > 0 && (
            <button
              type="button"
              onClick={onVaciarPapelera}
              className="rounded-lg border border-oliva-700 px-3 py-1.5 text-sm text-oliva-300 transition hover:border-amber-500 hover:text-amber-300 sm:px-2.5 sm:py-1 sm:text-xs"
            >
              Vaciar papelera ({enPapelera})
            </button>
          )}

          {/* Búsqueda */}
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, lugar o especie"
            className="w-full rounded-lg border border-oliva-700 bg-oliva-950/50 px-3 py-2 text-base text-oliva-100 placeholder:text-oliva-500 outline-none transition focus:border-oliva-400 sm:py-1.5 sm:text-xs"
          />

          {filtrados.length === 0 ? (
            <p className="text-sm text-oliva-300">
              {casos.length === 0
                ? "Todavía no hay casos guardados. Confirma un borrador para crear el primero."
                : "Ningún caso coincide con el filtro."}
            </p>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {filtrados.map((caso) => {
                const activo = caso.id === casoActivoId;

                return (
                  <li key={caso.id}>
                    <div
                      className={
                        activo
                          ? "rounded-xl border border-oliva-400 bg-oliva-800 px-3 py-2"
                          : "rounded-xl border border-oliva-700 bg-oliva-950/40 px-3 py-2 transition hover:border-oliva-400 hover:bg-oliva-800"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => onAbrirCaso(caso)}
                        className="w-full text-left"
                      >
                        <p className="text-sm font-semibold text-oliva-50">
                          {caso.titulo}
                        </p>
                        <p className="mt-0.5 text-xs text-oliva-300">
                          {caso.fecha ?? "sin fecha"} ·{" "}
                          {caso.enPapelera
                            ? "En papelera"
                            : caso.estado === "CONFIRMADO"
                            ? "Confirmado"
                            : "En borrador"}
                          {caso.borradores.length > 0
                            ? ` · ${caso.borradores.length} borrador${caso.borradores.length > 1 ? "es" : ""}`
                            : ""}
                        </p>
                      </button>

                      {caso.enPapelera ? (
                        <button
                          type="button"
                          onClick={() => onRestaurarCaso(caso)}
                          title="Restaurar caso"
                          className="mt-1 py-1 text-sm text-oliva-400 underline-offset-2 transition hover:text-oliva-100 hover:underline sm:text-xs"
                        >
                          Restaurar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEliminarCaso(caso)}
                          title="Mover a la papelera"
                          className="mt-1 py-1 text-sm text-oliva-500 underline-offset-2 transition hover:text-amber-400 hover:underline sm:text-xs"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {mensajeEstado && (
            <p className="text-xs leading-relaxed text-oliva-300">
              {mensajeEstado}
            </p>
          )}

          <div className="shrink-0 border-t border-oliva-800 pt-1">
            <LogoutButton />
          </div>
        </div>
      </section>
    </>
  );
}
