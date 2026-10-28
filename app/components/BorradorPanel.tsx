"use client";

import { useState } from "react";
import { extraerPendientes } from "@/lib/casos";
import type { DocumentoGuardado } from "@/lib/casos";
import {
  TITULO_ENCABEZADO,
  TITULO_PIE,
  TITULO_RELATO,
  componerTextoParte,
} from "@/lib/plantillas";
import type { Antecedentes, BorradorParte, SeccionBorrador } from "@/lib/types";

type Props = {
  borrador: BorradorParte;
  /** Antecedentes del caso, para el resumen de cabecera. */
  antecedentes?: Antecedentes | null;
  /** Trazabilidad del documento de origen, si el caso nació de un archivo. */
  documento?: DocumentoGuardado | null;
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
  documento,
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
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [verTrazabilidad, setVerTrazabilidad] = useState(false);

  const textoCompleto = componerTextoParte(titulo, secciones);

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

  const indiceEncabezado = secciones.findIndex(
    (seccion) => seccion.titulo === TITULO_ENCABEZADO
  );
  const seccionesCuerpo = secciones
    .map((seccion, indice) => ({ seccion, indice }))
    .filter(({ seccion }) => seccion.titulo !== TITULO_ENCABEZADO);

  const guardar = async (confirmar: boolean) => {
    if (!onGuardar) return;

    setGuardando(true);
    setError("");

    try {
      const ok = await onGuardar(borradorActual, confirmar);
      if (ok && confirmar) setConfirmado(true);
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo guardar el borrador."
      );
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

  /**
   * Genera el .docx en el servidor con el formato de la plantilla.
   * Se envían las secciones ya editadas: no se vuelve a llamar a la IA.
   */
  const descargarWord = async () => {
    setDescargando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/documentos/word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          plantillaId: borrador.plantilla?.id ?? null,
          secciones,
        }),
      });

      if (!respuesta.ok) {
        let mensaje = "No se pudo generar el archivo Word.";
        try {
          const data = await respuesta.json();
          mensaje = data.error ?? mensaje;
        } catch {
          // La respuesta de error no era JSON: se usa el mensaje genérico.
        }
        throw new Error(mensaje);
      }

      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `${titulo.replace(/\s+/g, "_").toLowerCase()}.docx`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo generar el archivo Word."
      );
    } finally {
      setDescargando(false);
    }
  };

  const imprimir = () => {
    const ventana = window.open("", "_blank", "width=820,height=900");
    if (!ventana) return;

    const encabezado =
      indiceEncabezado >= 0 ? secciones[indiceEncabezado] : null;

    const cuerpo = seccionesCuerpo
      .map(({ seccion }) => {
        const contenido = escaparHtml(seccion.contenido).replace(
          /\n/g,
          "<br/>"
        );

        if (seccion.titulo === TITULO_PIE) {
          return `<div class="firma">${contenido}</div>`;
        }

        if (seccion.titulo === TITULO_RELATO) {
          return `<p class="relato">${contenido}</p>`;
        }

        return `<h2>${escaparHtml(seccion.titulo)}:</h2><p>${contenido}</p>`;
      })
      .join("");

    ventana.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escaparHtml(titulo)}</title>
    <style>
      body { font-family: Georgia, serif; margin: 48px; line-height: 1.6; color: #111; }
      .encabezado { text-align: center; font-size: 12px; font-weight: bold; letter-spacing: .08em; line-height: 1.5; padding-bottom: 10px; margin-bottom: 18px; white-space: pre-wrap; }
      h2 { margin-top: 20px; margin-bottom: 2px; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #111; }
      p { margin: 6px 0; text-align: justify; }
      .relato { margin-top: 0; }
      .firma { margin-top: 40px; font-size: 12px; line-height: 2; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    ${
      encabezado
        ? `<div class="encabezado">${escaparHtml(encabezado.contenido).replace(
            /\n/g,
            "<br/>"
          )}</div>`
        : ""
    }
    ${cuerpo}
  </body>
</html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  };

  /** Extractos del documento de origen asociados a cada antecedente. */
  const camposConFuente = Object.entries(documento?.trazabilidad ?? {})
    .filter(([, marca]) => Boolean(marca?.fuente))
    .slice(0, 15);

  const dudosos = Object.values(documento?.trazabilidad ?? {}).filter(
    (marca) => marca?.estado === "dudoso"
  ).length;

  const observaciones = documento?.observaciones ?? [];

  const resumen = [
    { etiqueta: "Procedimiento", valor: antecedentes?.tipoProcedimiento },
    { etiqueta: "Especie", valor: antecedentes?.especie },
    { etiqueta: "Lugar", valor: antecedentes?.lugar },
    { etiqueta: "Fecha", valor: antecedentes?.fecha },
    { etiqueta: "Detenido", valor: antecedentes?.detenido?.nombre },
    { etiqueta: "Delito", valor: antecedentes?.detencion?.delito },
    { etiqueta: "Hora detención", valor: antecedentes?.detencion?.hora },
    { etiqueta: "Lesiones", valor: antecedentes?.detencion?.lesiones },
  ].filter((item) => item.valor);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-oliva-950/70 sm:items-center sm:p-4">
      <div className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden border-oliva-200 bg-oliva-50 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl sm:border">
        {/* Encabezado */}
        <div className="flex flex-col gap-3 border-b border-oliva-200 bg-oliva-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-oliva-900 sm:text-lg">
              Borrador del parte policial
            </h2>
            <p className="mt-1 text-xs text-oliva-600">
              Generado el{" "}
              {new Date(borrador.generadoEn).toLocaleString("es-CL")} ·
              Es un borrador: revísalo y ajústalo antes de usarlo.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setVistaPrevia((valor) => !valor)}
              className="rounded-lg border border-oliva-300 px-3 py-1.5 text-sm text-oliva-700 transition hover:bg-oliva-200 hover:text-oliva-900"
            >
              {vistaPrevia ? "Editar" : "Vista previa"}
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg px-3 py-1.5 text-sm text-oliva-600 transition hover:bg-oliva-200 hover:text-oliva-900"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Resumen de antecedentes */}
        {resumen.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-oliva-200 bg-oliva-50 px-4 py-3 sm:px-6">
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

        {/* Cuerpo editable / vista previa */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {vistaPrevia ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-oliva-300 bg-white p-4 font-serif text-sm leading-relaxed text-oliva-900 shadow-sm sm:p-8">
              {indiceEncabezado >= 0 && (
                <div className="mb-6 whitespace-pre-wrap border-b border-oliva-300 pb-4 text-xs leading-relaxed">
                  {secciones[indiceEncabezado].contenido}
                </div>
              )}

              {seccionesCuerpo.map(({ seccion, indice }) => {
                if (seccion.titulo === TITULO_PIE) {
                  return (
                    <div
                      key={indice}
                      className="mt-10 whitespace-pre-wrap text-xs leading-relaxed"
                    >
                      {seccion.contenido}
                    </div>
                  );
                }

                if (seccion.titulo === TITULO_RELATO) {
                  return (
                    <p
                      key={indice}
                      className="mb-4 whitespace-pre-wrap text-justify"
                    >
                      {seccion.contenido}
                    </p>
                  );
                }

                return (
                  <div key={indice} className="mb-5">
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-oliva-900">
                      {seccion.titulo}:
                    </h4>
                    <p className="whitespace-pre-wrap text-justify">
                      {seccion.contenido}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {indiceEncabezado >= 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-oliva-800">
                Membrete del documento
              </label>
              <textarea
                value={secciones[indiceEncabezado].contenido}
                onChange={(e) =>
                  actualizarContenido(indiceEncabezado, e.target.value)
                }
                rows={6}
                className="w-full resize-y rounded-xl border border-oliva-300 bg-oliva-50 px-4 py-3 font-mono text-base leading-relaxed text-oliva-900 outline-none transition focus:border-oliva-500 focus:ring-2 focus:ring-oliva-500/25 sm:text-xs"
              />
              <p className="mt-1 text-xs text-oliva-600">
                Carabineros de Chile, prefectura y unidad. Se configura con{" "}
                <code>UNIDAD_PREFECTURA</code> y <code>UNIDAD_NOMBRE</code>; si
                no están definidas, el documento no lleva membrete y puedes
                escribirlo aquí.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-oliva-800">
              Nombre del documento (no se imprime)
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-xl border border-oliva-300 bg-white px-4 py-2 text-base font-semibold text-oliva-900 outline-none transition focus:border-oliva-500 focus:ring-2 focus:ring-oliva-500/25 sm:text-sm"
            />
          </div>

          {/* Trazabilidad del documento de origen */}
          {documento && (
            <div className="rounded-xl border border-oliva-200 bg-oliva-50 px-4 py-3 text-sm text-oliva-800">
              <button
                type="button"
                onClick={() => setVerTrazabilidad((valor) => !valor)}
                className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              >
                <span className="font-semibold">Trazabilidad del acta</span>
                <span className="text-xs text-oliva-600">
                  {documento.origen?.nombre ?? "documento"} · {dudosos} dato(s)
                  sin respaldo literal ·{" "}
                  {verTrazabilidad ? "ocultar" : "ver detalles"}
                </span>
              </button>

              {verTrazabilidad && (
                <div className="mt-3 space-y-3 border-t border-oliva-200 pt-3 text-xs">
                  {documento.plantilla && (
                    <p className="text-oliva-600">
                      Plantilla:{" "}
                      <span className="font-semibold text-oliva-800">
                        {documento.plantilla.nombre} v
                        {documento.plantilla.version}
                      </span>
                      {documento.origen?.procesadoEn && (
                        <>
                          {" · "}Procesado el{" "}
                          {new Date(
                            documento.origen.procesadoEn
                          ).toLocaleString("es-CL")}
                        </>
                      )}
                    </p>
                  )}

                  {observaciones.length > 0 && (
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-oliva-600">
                        Observaciones de validación
                      </p>
                      <ul className="mt-1 space-y-1">
                        {observaciones.slice(0, 10).map((observacion, indice) => (
                          <li key={`${observacion.campo}-${indice}`}>
                            <span className="font-semibold">
                              [{observacion.nivel}]
                            </span>{" "}
                            {observacion.mensaje}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {camposConFuente.length > 0 ? (
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-oliva-600">
                        Extractos del documento
                      </p>
                      <ul className="mt-1 space-y-2">
                        {camposConFuente.map(([ruta, marca]) => (
                          <li key={ruta}>
                            <span className="font-semibold">{ruta}</span>
                            <span className="block italic text-oliva-700">
                              «{marca.fuente}»
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-oliva-600">
                      No se localizaron extractos literales del documento para
                      los antecedentes: verifica cada dato antes de firmar.
                    </p>
                  )}

                  {documento.sinDestino && documento.sinDestino.length > 0 && (
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-oliva-600">
                        Sin sección de destino
                      </p>
                      <p className="mt-1">{documento.sinDestino.join(", ")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          {seccionesCuerpo.map(({ seccion, indice }) => (
            <div key={`${seccion.titulo}-${indice}`}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-oliva-800">
                {seccion.titulo === TITULO_RELATO
                  ? "Relato de los hechos"
                  : seccion.titulo}
              </label>
              <textarea
                value={seccion.contenido}
                onChange={(e) => actualizarContenido(indice, e.target.value)}
                rows={Math.max(3, seccion.contenido.split("\n").length + 1)}
                className="w-full resize-y rounded-xl border border-oliva-300 bg-white px-4 py-3 text-base leading-relaxed text-oliva-900 outline-none transition focus:border-oliva-500 focus:ring-2 focus:ring-oliva-500/25 sm:text-sm"
              />
            </div>
          ))}
            </div>
          )}
        </div>

        {/* Pie: revisión y acciones */}
        <div className="border-t border-oliva-200 bg-oliva-100 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
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

          {error && (
            <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              {error}
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-wrap sm:gap-3">
            {onGuardar && (
              <button
                type="button"
                onClick={() => guardar(false)}
                disabled={guardando}
                className="w-full rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50 disabled:opacity-60 sm:w-auto"
              >
                {guardando ? "GUARDANDO..." : "Guardar"}
              </button>
            )}
            <button
              type="button"
              onClick={copiar}
              className="w-full rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50 sm:w-auto"
            >
              {copiado ? "¡Copiado!" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={descargarWord}
              disabled={descargando}
              className="w-full rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50 disabled:opacity-60 sm:w-auto"
            >
              {descargando ? "GENERANDO WORD..." : "Descargar Word"}
            </button>
            <button
              type="button"
              onClick={descargar}
              className="w-full rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50 sm:w-auto"
            >
              Descargar .txt
            </button>
            <button
              type="button"
              onClick={imprimir}
              className="w-full rounded-xl border border-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-600 hover:text-oliva-50 sm:w-auto"
            >
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => guardar(true)}
              disabled={!revisado || guardando || !onGuardar}
              className="col-span-2 w-full rounded-xl bg-oliva-600 px-4 py-2 text-sm font-semibold text-oliva-50 transition hover:bg-oliva-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1 sm:w-auto"
            >
              Confirmar borrador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
