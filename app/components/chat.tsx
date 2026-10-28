"use client"

import React from "react";
import { useState, useEffect, useRef } from "react";
import {
  camposFaltantes,
  crearAntecedentesVacios,
  puedeRedactarBorrador,
} from "@/lib/antecedentes";
import { pedirJson } from "@/lib/cliente";
import { MENSAJE_MAXIMO } from "@/lib/constantes";
import { PLANTILLAS } from "@/lib/documentos/plantillas";
import type { DocumentoProcesado } from "@/lib/documentos/tipos";
import type { DocumentoGuardado } from "@/lib/casos";
import type { Antecedentes, BorradorParte, ResultadoAnalisis } from "@/lib/types";
import EstadoCaso from "./EstadoCaso";

type Props = {
  /** Abre el menú lateral en móvil y tablet. */
  onAbrirMenu: () => void;
  /** Notifica que se generó un borrador para mostrarlo en el visor. */
  onBorradorGenerado: (
    borrador: BorradorParte,
    antecedentes: Antecedentes,
    documento?: DocumentoGuardado | null
  ) => void;
};

/** Convierte el documento procesado en los metadatos que se guardan con el caso. */
const documentoGuardable = (
  documento: DocumentoProcesado
): DocumentoGuardado => ({
  origen: {
    nombre: documento.origen.nombre,
    tipo: documento.origen.tipo,
    metodo: documento.origen.metodo,
    caracteres: documento.origen.caracteres,
    paginas: documento.origen.paginas,
    hash: documento.origen.hash,
    procesadoEn: documento.origen.procesadoEn,
    advertencias: documento.origen.advertencias,
  },
  plantilla: documento.plantilla,
  observaciones: documento.observaciones,
  faltantes: documento.faltantes,
  sinDestino: documento.sinDestino,
  trazabilidad: documento.trazabilidad.campos,
});

/** Resumen conversacional del documento procesado. */
const resumenDocumento = (documento: DocumentoProcesado): string => {
  const lineas = [
    `Acta procesada: ${documento.origen.nombre} (${documento.origen.caracteres.toLocaleString(
      "es-CL"
    )} caracteres).`,
    `Plantilla sugerida: ${documento.plantilla.nombre} (v${documento.plantilla.version}).`,
  ];

  if (documento.observaciones.length > 0) {
    lineas.push("", "Observaciones de validación:");
    lineas.push(
      ...documento.observaciones
        .slice(0, 8)
        .map((observacion) => `· [${observacion.nivel}] ${observacion.mensaje}`)
    );

    if (documento.observaciones.length > 8) {
      lineas.push(
        `· y ${documento.observaciones.length - 8} observaciones más.`
      );
    }
  }

  if (documento.faltantes.length > 0) {
    lineas.push("", `Faltan antecedentes: ${documento.faltantes.join(", ")}.`);
  }

  if (documento.sinDestino.length > 0) {
    lineas.push(
      "",
      `Sin sección de destino en la plantilla: ${documento.sinDestino.join(", ")}.`
    );
  }

  const dudosos = Object.values(documento.trazabilidad.campos).filter(
    (campo) => campo.estado === "dudoso"
  ).length;

  if (dudosos > 0) {
    lineas.push(
      "",
      `${dudosos} dato(s) no se localizaron literalmente en el documento: revísalos antes de firmar.`
    );
  }

  lineas.push(
    "",
    documento.puedeRedactar
      ? "Puedes generar el borrador y corregirlo antes de descargar el Word."
      : "No se puede generar el documento definitivo hasta resolver lo anterior."
  );

  return lineas.join("\n");
};

export default function Chat({ onAbrirMenu, onBorradorGenerado }: Props) {

    type Mensaje = {
        contenido: string;
        autor: "funcionario" | "cabo" | "error";
    };
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [antecedentes, setAntecedentes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [datosAntecedentes, setDatosAntecedentes] =
        useState<Antecedentes>(crearAntecedentesVacios);
    const [borradorCargando, setBorradorCargando] = useState(false);
    // Mensajes largos (por ejemplo, un acta pegada) se muestran colapsados.
    const [expandidos, setExpandidos] = useState<Record<number, boolean>>({});
    // Tiempo transcurrido mientras el modelo procesa, para que la espera no
    // parezca que la aplicación se colgó.
    const [segundos, setSegundos] = useState(0);
    // Documento de origen procesado (acta en Word, PDF o texto).
    const [documento, setDocumento] = useState<DocumentoProcesado | null>(null);
    const [plantillaId, setPlantillaId] = useState("auto");
    const [subiendo, setSubiendo] = useState(false);
    const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
    const archivoRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isLoading) {
            setSegundos(0);
            return;
        }

        const inicio = Date.now();
        const temporizador = setInterval(
            () => setSegundos(Math.floor((Date.now() - inicio) / 1000)),
            1000
        );

        return () => clearInterval(temporizador);
    }, [isLoading]);

    // El borrador solo está disponible si no faltan campos y no hay
    // contradicciones entre procedimientos.
    const puedeConfeccionar = puedeRedactarBorrador(datosAntecedentes);

    /** Descarta la contradicción detectada y sigue con el caso en curso. */
    const resolverContradicciones = () => {
        setDatosAntecedentes((prev) => ({ ...prev, contradicciones: [] }));
    };

    const finalMensajes = useRef<HTMLDivElement>(null);
    useEffect(() => {
        finalMensajes.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [mensajes, isLoading]);

    /**
     * Procesa un acta adjunta (TXT, DOCX o PDF): el servidor extrae el texto,
     * consulta al modelo y valida los antecedentes. El archivo no se envía a
     * ningún servicio distinto del backend de la aplicación.
     */
    const handleArchivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = event.target.files?.[0];
        event.target.value = "";

        if (!archivo) return;

        setSubiendo(true);
        setErrorDocumento(null);
        setMensajes((mensajesActuales) => [
            ...mensajesActuales,
            { autor: "funcionario", contenido: `Adjunto acta: ${archivo.name}` },
        ]);

        try {
            const formulario = new FormData();
            formulario.append("archivo", archivo);

            if (plantillaId !== "auto") {
                formulario.append("plantillaId", plantillaId);
            }

            const respuesta = await fetch("/api/documentos/procesar", {
                method: "POST",
                body: formulario,
            });
            const data = await respuesta.json();

            if (!respuesta.ok || !data.ok) {
                throw new Error(
                    data.error ?? "No se pudo procesar el documento."
                );
            }

            const procesado = data.documento as DocumentoProcesado;

            setDocumento(procesado);
            setPlantillaId(procesado.plantilla.id);
            setDatosAntecedentes(procesado.antecedentes);
            setMensajes((mensajesActuales) => [
                ...mensajesActuales,
                { autor: "cabo", contenido: resumenDocumento(procesado) },
            ]);
        } catch (error) {
            const mensaje =
                error instanceof Error
                    ? error.message
                    : "No se pudo procesar el documento.";

            setErrorDocumento(mensaje);
            setMensajes((mensajesActuales) => [
                ...mensajesActuales,
                { autor: "error", contenido: mensaje },
            ]);
        } finally {
            setSubiendo(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const textoIngresado = antecedentes.trim();

        if (!textoIngresado) {
            return;
        }

        const mensajeUsuario: Mensaje = {
            contenido: textoIngresado,
            autor: "funcionario"
        };

        setMensajes((mensajesActuales) => [
            ...mensajesActuales,
            mensajeUsuario,
        ]);
        setAntecedentes("");
        setIsLoading(true);

        try {
            const payload = {
                mensaje: textoIngresado,
                antecedentes: datosAntecedentes,
            };

            const data = await pedirJson<ResultadoAnalisis & { error?: string }>(
                "/api/chat",
                {
                    method: "POST",
                    body: JSON.stringify(payload),
                },
                // Margen amplio: un acta larga se procesa por trozos.
                { timeoutMs: 360_000 }
            );

            if (!data.respuesta) {
                throw new Error("La API no devolvió una respuesta conversacional.");
            }

            const resultado = data.respuesta;

            // El servidor devuelve el estado acumulado completo:
            // se reemplaza directamente, sin fusionar campo por campo.
            setDatosAntecedentes({
                tipoProcedimiento: data.tipoProcedimiento,
                especie: data.especie,
                lugar: data.lugar,
                fecha: data.fecha,
                descripcionHechos: data.descripcionHechos,
                detenido: data.detenido,
                detencion: data.detencion,
                funcionarios: data.funcionarios,
                fiscal: data.fiscal,
                pruebas: data.pruebas,
                vehiculos: data.vehiculos,
                testigos: data.testigos,
                camaras: data.camaras,
                diligencias: data.diligencias,
                detalleEspecies: data.detalleEspecies,
                contradicciones: data.contradicciones,
            });

            setMensajes((mensajesActuales) => [
                ...mensajesActuales,
                {
                    contenido: resultado,
                    autor: "cabo"
                }
            ]);
        } catch (error) {
            setMensajes((mensajesActuales) => [
                ...mensajesActuales,
                {
                    contenido: error instanceof Error ? error.message : "No pude procesar la solicitud.",
                    autor: "error"
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerarBorrador = async () => {
        setBorradorCargando(true);
        try {
            const data = await pedirJson<{
                ok: boolean;
                error?: string;
                borrador?: BorradorParte;
                plantilla?: { id: string; nombre: string; version: string };
            }>(
                "/api/borrador",
                {
                    method: "POST",
                    body: JSON.stringify({
                        antecedentes: datosAntecedentes,
                        plantillaId:
                            plantillaId === "auto" ? null : plantillaId,
                    }),
                }
            );

            if (!data.ok || !data.borrador) {
                throw new Error(data.error ?? "No se pudo generar el borrador.");
            }

            if (data.plantilla) {
                setPlantillaId(data.plantilla.id);
            }

            onBorradorGenerado(
                { ...data.borrador, plantilla: data.plantilla },
                datosAntecedentes,
                documento ? documentoGuardable(documento) : null
            );
        } catch (error) {
            setMensajes((mensajesActuales) => [
                ...mensajesActuales,
                {
                    contenido: error instanceof Error ? error.message : "No pude generar el borrador.",
                    autor: "error",
                },
            ]);
        } finally {
            setBorradorCargando(false);
        }
    };

    return (
    
    <section className="flex min-h-0 w-full flex-1 flex-col bg-oliva-100">
            <header className="flex flex-wrap items-center gap-3 border-b border-oliva-200 bg-oliva-50 p-4 sm:justify-between sm:p-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  type="button"
                  onClick={onAbrirMenu}
                  aria-label="Abrir menú de casos"
                  aria-controls="panel-casos"
                  className="rounded-lg border border-oliva-300 p-2 text-oliva-700 transition hover:bg-oliva-200 hover:text-oliva-900 lg:hidden"
                >
                  <span className="block text-lg leading-none">☰</span>
                </button>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold tracking-tight text-oliva-900">
                    GUARDIA VIRTUAL
                  </h2>
                  <p className="truncate text-sm text-oliva-600">Asistente de apoyo documental</p>
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
                {puedeConfeccionar && (
                  <button
                    type="button"
                    onClick={handleGenerarBorrador}
                    disabled={borradorCargando}
                    className="
                    flex-1
                    rounded-xl
                    bg-oliva-600
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-oliva-50
                    transition
                    hover:bg-oliva-700
                    disabled:opacity-60
                    sm:flex-none
                    sm:py-2
                    "
                  >
                    {borradorCargando ? "GENERANDO..." : "GENERAR BORRADOR"}
                  </button>
                )}
                <div className="hidden flex-row items-center gap-2 text-sm text-oliva-600 sm:flex">
                  <p className="text-oliva-500">●</p>
                  <p>En línea</p>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                {mensajes.length === 0 && (
                    <div className="mx-auto max-w-md rounded-2xl border border-oliva-200 bg-oliva-50 p-4 text-center sm:p-6">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-oliva-500">
                            Nuevo parte
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-oliva-600">
                            Adjunta el <strong>acta de aprehensión</strong>{" "}
                            (DOCX, PDF o TXT) o pega el texto. Extraigo los
                            antecedentes, las individualizaciones y la relación
                            de los hechos.
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-oliva-600">
                            También puedes escribir el <strong>tipo de
                            procedimiento</strong>, la <strong>especie</strong>,
                            el <strong>lugar</strong>, la <strong>fecha</strong>{" "}
                            y, si hay detención, los datos del{" "}
                            <strong>detenido</strong> y del{" "}
                            <strong>personal aprehensor</strong>. Cuando estén
                            los datos, genero el borrador y podrás revisarlo
                            antes de descargar el Word.
                        </p>
                    </div>
                )}

                {mensajes.map((mensaje, index) => {
                    const esLargo = mensaje.contenido.length > 1200;
                    const abierto = Boolean(expandidos[index]);
                    const texto =
                        esLargo && !abierto
                            ? `${mensaje.contenido.slice(0, 1200)}…`
                            : mensaje.contenido;

                    return (
                    <div key={index}
                        className={
                            mensaje.autor === "funcionario"
                            ? "mt-3 flex justify-end first:mt-0"
                            : "mt-3 flex justify-start first:mt-0"
                    }
                    >
                        <div className={
                            mensaje.autor === "funcionario"
                            ? "flex max-w-[85%] flex-col gap-1 break-words rounded-xl border border-oliva-300 bg-oliva-200 p-3 text-oliva-900 sm:max-w-[75%] sm:p-4"
                            : mensaje.autor === "error"
                            ? "flex max-w-[85%] flex-col gap-1 break-words rounded-xl border border-red-300 bg-red-50 p-3 text-red-900 sm:max-w-[75%] sm:p-4"
                            : "flex max-w-[85%] flex-col gap-1 break-words rounded-xl border border-oliva-700 bg-oliva-800 p-3 text-oliva-50 sm:max-w-[75%] sm:p-4"
                        }>
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                            {mensaje.autor === "error" ? "error" : mensaje.autor}
                        </p>
                        <p className="whitespace-pre-wrap">{texto}</p>
                        {esLargo && (
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandidos((previos) => ({
                                        ...previos,
                                        [index]: !abierto,
                                    }))
                                }
                                className="self-start text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
                            >
                                {abierto
                                    ? "Mostrar menos"
                                    : `Mostrar completo (${mensaje.contenido.length.toLocaleString("es-CL")} caracteres)`}
                            </button>
                        )}
                        </div>
                    </div>
                    );
                })}

                {isLoading && (
                    <div className="mt-3 flex justify-start">
                        <div className="flex max-w-[85%] flex-col gap-1 break-words rounded-xl border border-oliva-700 bg-oliva-800 p-3 text-oliva-50 sm:max-w-[75%] sm:p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                                cabo
                            </p>
                            <p>
                                Analizando antecedentes
                                {segundos > 2 && ` · ${segundos} s`}...
                            </p>
                            <p className="text-xs opacity-70">
                                Si pegaste un acta extensa, se procesa por
                                partes y puede tardar un minuto.
                            </p>
                        </div>
                    </div>
                )}

                <div ref={finalMensajes}></div>

            </div>

            <EstadoCaso
                faltantes={camposFaltantes(datosAntecedentes)}
                contradicciones={datosAntecedentes.contradicciones}
                onResolver={resolverContradicciones}
            />

            {documento && (
              <div className="border-t border-oliva-200 bg-oliva-50 px-4 py-2 text-xs text-oliva-700 sm:px-6">
                <span className="font-semibold">Acta de origen:</span>{" "}
                {documento.origen.nombre} · {documento.plantilla.nombre} v
                {documento.plantilla.version} ·{" "}
                {documento.observaciones.length} observación(es) ·{" "}
                {documento.origen.caracteres.toLocaleString("es-CL")} caracteres
              </div>
            )}

            <div className="border-t border-oliva-200 bg-oliva-100">
              <form onSubmit={handleSubmit} className="
              flex
              flex-col
              flex-wrap
              gap-2
              p-4
              pb-[calc(1rem+env(safe-area-inset-bottom))]
              sm:flex-row
              sm:gap-3
              sm:p-6
              "
        
              >
                <div className="flex flex-wrap items-center gap-2 sm:basis-full">
                  <input
                    ref={archivoRef}
                    type="file"
                    accept=".txt,.md,.docx,.pdf"
                    onChange={handleArchivo}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => archivoRef.current?.click()}
                    disabled={isLoading || subiendo}
                    className="rounded-lg border border-oliva-300 bg-oliva-50 px-3 py-2 text-xs font-semibold text-oliva-700 transition hover:bg-oliva-200 disabled:opacity-60"
                  >
                    {subiendo ? "PROCESANDO ACTA…" : "ADJUNTAR ACTA"}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-oliva-600">
                    Plantilla
                    <select
                      value={plantillaId}
                      onChange={(event) => setPlantillaId(event.target.value)}
                      disabled={isLoading || subiendo}
                      className="rounded-lg border border-oliva-300 bg-oliva-50 px-2 py-1.5 text-xs text-oliva-800 outline-none focus:border-oliva-500"
                    >
                      <option value="auto">Automática</option>
                      {PLANTILLAS.map((plantilla) => (
                        <option key={plantilla.id} value={plantilla.id}>
                          {plantilla.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="text-xs text-oliva-500">
                    TXT, DOCX o PDF con texto digital · máx. 10 MB
                  </span>
                  {errorDocumento && (
                    <span className="text-xs font-semibold text-red-700">
                      {errorDocumento}
                    </span>
                  )}
                </div>
                <textarea
                className="
                min-w-0
                w-full
                max-h-48
                flex-1
                resize-y
                px-4
                py-3
                rounded-xl
                border
                border-oliva-300
                bg-oliva-50
                text-oliva-900
                placeholder:text-oliva-600
                outline-none
                focus:border-oliva-500
                focus:ring-2
                focus:ring-oliva-500/25
                sm:w-auto
                sm:px-6
                "
                rows={2}
                placeholder="Escriba los antecedentes o pegue el acta de aprehensor completa"
                value={antecedentes}
                onChange={(e) => setAntecedentes(e.target.value)}
                onKeyDown={(e) => {
                  // Enter envía; Mayús+Enter inserta un salto de línea.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                disabled={isLoading}
                />
                  <button type="submit"
                  className="
                  w-full
                  shrink-0
                  px-6
                  py-3
                  bg-oliva-600
                  text-oliva-50
                  rounded-xl
                  hover:bg-oliva-700
                  disabled:opacity-60
                  sm:w-auto
                  "
                  disabled={isLoading}
                  >{isLoading ? "PROCESANDO..." : "ENVIAR"}</button>

                  <p className="text-xs leading-relaxed text-oliva-600 sm:basis-full">
                    Puedes pegar el acta de aprehensor completa. Enter envía;
                    Mayús + Enter hace un salto de línea.
                    {antecedentes.length > 0 && (
                      <>
                        {" "}
                        <span
                          className={
                            antecedentes.length > MENSAJE_MAXIMO
                              ? "font-semibold text-red-700"
                              : "font-semibold"
                          }
                        >
                          {antecedentes.length.toLocaleString("es-CL")} /{" "}
                          {MENSAJE_MAXIMO.toLocaleString("es-CL")}
                        </span>{" "}
                        caracteres.
                      </>
                    )}
                  </p>
              </form>
            </div>
          </section>
  );
}
