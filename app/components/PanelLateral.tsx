"use client";

import { useMemo, useState } from "react";
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
  onEliminarCaso: (caso: CasoResumen) => void;
  onRestaurarCaso: (caso: CasoResumen) => void;
  onVaciarPapelera: () => void;
};

type Filtro = "TODOS" | "BORRADOR" | "CONFIRMADO" | "PAPELERA";

const FILTROS: Array<{ id: Filtro; etiqueta: string }> = [
  { id: "TODOS", etiqueta: "Todos" },
  { id: "BORRADOR", etiqueta: "En borrador" },
  { id: "CONFIRMADO", etiqueta: "Confirmados" },
  { id: "PAPELERA", etiqueta: "Papelera" },
];

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
  onEliminarCaso,
  onRestaurarCaso,
  onVaciarPapelera,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [busqueda, setBusqueda] = useState("");

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

  const confirmados = casos.filter(
    (caso) => caso.estado === "CONFIRMADO" && !caso.enPapelera
  ).length;

  const enPapelera = casos.filter((caso) => caso.enPapelera).length;

  return (
    <section className="
      w-[20%]
      flex
      flex-col
      p-6
      gap-6
      bg-oliva-900
      text-oliva-100
      ">
      <div className="flex flex-col gap-3">
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
            <span className="ml-2 font-normal normal-case text-oliva-500">
              {casos.length - enPapelera} total · {confirmados} confirmados
              {enPapelera > 0 ? ` · ${enPapelera} en papelera` : ""}
            </span>
          </h3>
          <button
            type="button"
            onClick={onNuevoCaso}
            className="rounded-lg border border-oliva-400 px-2.5 py-1 text-xs font-semibold text-oliva-200 transition hover:bg-oliva-400 hover:text-oliva-950"
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
                  ? "rounded-lg bg-oliva-500 px-2.5 py-1 text-xs font-semibold text-oliva-950"
                  : "rounded-lg border border-oliva-700 px-2.5 py-1 text-xs text-oliva-300 transition hover:border-oliva-400 hover:text-oliva-100"
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
            className="rounded-lg border border-oliva-700 px-2.5 py-1 text-xs text-oliva-300 transition hover:border-amber-500 hover:text-amber-300"
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
          className="w-full rounded-lg border border-oliva-700 bg-oliva-950/50 px-3 py-1.5 text-xs text-oliva-100 placeholder:text-oliva-500 outline-none transition focus:border-oliva-400"
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
                        className="mt-1 text-xs text-oliva-400 underline-offset-2 transition hover:text-oliva-100 hover:underline"
                      >
                        Restaurar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEliminarCaso(caso)}
                        title="Mover a la papelera"
                        className="mt-1 text-xs text-oliva-500 underline-offset-2 transition hover:text-amber-400 hover:underline"
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
      </div>

      {mensajeEstado && (
        <p className="text-xs leading-relaxed text-oliva-300">{mensajeEstado}</p>
      )}
    </section>
  );
}
