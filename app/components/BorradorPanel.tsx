"use client";

import { useState } from "react";
import { extraerPendientes } from "@/lib/casos";
import type { Antecedentes, BorradorParte, SeccionBorrador } from "@/lib/types";

type Props = {
  borrador: BorradorParte;
  /** Antecedentes del caso, para el resumen de cabecera. */
  antecedentes?: Antecedentes | null;
  onCerrar: () => void;
  /** Guarda el borrador (con los cambios del funcionario) en la base de datos. */
  onGuardar?: (
    borrador: BorradorParte,
    confirmar: boolean
  ) => boolean | Promise<boolean>;
};

/** Escapa HTML para la vista de impresión. */
const escaparHtml = (texto: string): string =>
  texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export default function BorradorPanel({
  borrador,
  antecedentes,
  onCerrar,
  onGuardar,
}: Props) {
  const [titulo, setTitulo] = useState(borrador.titulo);
  const [secciones, setSecciones] = useState<SeccionBorrador[]>(
    borrador.secciones
  );
  const [revisado, setRevisado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const textoCompleto = `${titulo}\n\n${secciones
    .map((seccion) => `${seccion.titulo}\n${seccion.contenido}`)
    .join("\n\n")}`;

  /** El borrador con las ediciones del funcionario. */
  const borradorActual: BorradorParte = {
    ...borrador,
    titulo,
    secciones,
    textoCompleto,
  };

  const pendientes = extraerPendientes(secciones);
  const totalPendientes = pendientes.reduce(
    (total, seccion) => total + seccion.pendientes.length,
    0
  );

  const guardar = async (confirmar: boolean) => {
    if (!onGuardar) return;

    setGuardando(true);
    try {
      const ok = await onGuardar(borradorActual, confirmar);
      if (ok && confirmar) setConfirmado(true);
    } finally {
      setGuardando(false);
    }
  };

  const actualizarContenido = (indice: number, contenido: string) => {
    setSecciones((previas) =>
      previas.map((seccion, i) =>
        i === indice ? { ...seccion, contenido } : seccion
      )
    );
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoCompleto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // El portapapeles puede no estar disponible (permiso denegado).
    }
  };

  const descargar = () => {
    const blob = new Blob([textoCompleto], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `${titulo.replace(/\s+/g, "_").toLowerCase()}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const imprimir = () => {
    const ventana = window.open("", "_blank", "width=820,height=900");
    if (!ventana) return;

    const cuerpo = secciones
      .map(
        (seccion) =>
          `<h2>${escaparHtml(seccion.titulo)}</h2><p>${escaparHtml(
            seccion.contenido
          ).replace(/\n/g, "<br/>")}</p>`
      )
      .join("");

    ventana.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escaparHtml(titulo)}</title>
    <style>
      body { font-family: Georgia, serif; margin: 48px; line-height: 1.6; color: #111; }
      h1 { border-bottom: 2px solid #4e5839; padding-bottom: 8px; font-size: 20px; }
      h2 { margin-top: 28px; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #3a412c; }
      p { margin: 6px 0; }
    </style>
  </head>
  <body>
    <h1>${escaparHtml(titulo)}</h1>
    ${cuerpo}
  </body>
</html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  };

  const resumen = [
    { etiqueta: "Procedimiento", valor: antecedentes?.tipoProcedimiento },
    { etiqueta: "Especie", valor: antecedentes?.especie },
    { etiqueta: "Lugar", valor: antecedentes?.lugar },
    { etiqueta: "Fecha", valor: antecedentes?.fecha },
  ].filter((item) => item.valor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-oliva-950/70 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-oliva-200 bg-oliva-50 shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 border-b border-oliva-200 bg-oliva-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-oliva-900">
              Borrador del parte policial
            </h2>
            <p className="mt-1 text-xs text-oliva-600">
              Generado el{" "}
              {new Date(borrador.generadoEn).toLocaleString("es-CL")} ·
              Es un borrador: revísalo y ajústalo antes de usarlo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-3 py-1.5 text-sm text-oliva-600 transition hover:bg-oliva-200 hover:text-oliva-900"
          >
            Cerrar
          </button>
        </div>

        {/* Resumen de antecedentes */}
        {resumen.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-oliva-200 bg-oliva-50 px-6 py-3">
            {resumen.map((item) => (
              <span
                key={item.etiqueta}
                className="rounded-lg border border-oliva-200 bg-white px-2.5 py-1 text-xs text-oliva-800"
              >
                <span className="font-semibold uppercase tracking-wide text-oliva-500">
                  {item.etiqueta}:{" "}
                </span>
                {item.valor}
              </span>
            ))}
          </div>
        )}

        {/* Cuerpo editable */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-oliva-800">
              Título
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-xl border border-oliva-300 bg-white px-4 py-2 text-sm font-semibold text-oliva-900 outline-none transition focus:border-oliva-500 focus:ring-2 focus:ring-oliva-500/25"
            />
          </div>

          {/* Indicador de completitud */}
          {totalPendientes > 0 ? (
            <div className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">
                Faltan {totalPendientes} dato
                {totalPendientes > 1 ? "s" : ""} por completar
              </p>
              <ul className="mt-1.5 space-y-1 pl-4">
                {pendientes.map((seccion) => (
                  <li key={seccion.titulo}>
                    <span className="font-semibold">{seccion.titulo}:</span>{" "}
                    {seccion.pendientes.join("; ")}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-800">
                Puedes completarlos en el chat y volver a generar el borrador, o
                dejarlos así si no corresponden a este parte.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-oliva-500 bg-oliva-100 px-4 py-3 text-sm text-oliva-800">
              ✓ Todos los datos del parte están completos.
            </div>
          )}

          {secciones.map((seccion, indice) => (
            <div key={seccion.titulo}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-oliva-800">
                {seccion.titulo}
              </label>
              <textarea
                value={seccion.contenido}
                onChange={(e) => actualizarContenido(indice, e.target.value)}
                rows={Math.max(3, seccion.contenido.split("\n").length + 1)}
                className="w-full resize-y rounded-xl border border-oliva-300 bg-white px-4 py-3 text-sm leading-relaxed text-oliva-900 outline-none transition focus:border-oliva-500 focus:ring-2 focus:ring-oliva-500/25"
              />
            </div>
          ))}
        </div>

        {/* Pie: revisión y acciones */}
        <div className="border-t border-oliva-200 bg-oliva-100 px-6 py-4">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-oliva-900">
            <input
              type="checkbox"
              checked={revisado}
              onChange={(e) => setRevisado(e.target.checked)}
              className="mt-1"
            />
            <span>
              He revisado y valido el contenido de este borrador. Como
              funcionario, asumo la responsabilidad del documento final.
            </span>
          </label>

          {confirmado && (
            <p className="mt-3 rounded-lg border border-oliva-500 bg-oliva-50 px-3 py-2 text-sm text-oliva-800">
              Borrador revisado y confirmado. Ya puedes copiarlo, descargarlo o
              imprimirlo.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {onGuardar && (
              <button
                type="button"
                onClick={() => guardar(false)}
                disabled={guardando}
                className="rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50 disabled:opacity-60"
              >
                {guardando ? "GUARDANDO..." : "Guardar"}
              </button>
            )}
            <button
              type="button"
              onClick={copiar}
              className="rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50"
            >
              {copiado ? "¡Copiado!" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={descargar}
              className="rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50"
            >
              Descargar .txt
            </button>
            <button
              type="button"
              onClick={imprimir}
              className="rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50"
            >
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => guardar(true)}
              disabled={!revisado || guardando || !onGuardar}
              className="rounded-xl bg-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-50 transition hover:bg-oliva-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar borrador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
