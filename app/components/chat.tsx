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
                        // La plantilla se elige automáticamente según el caso.
                        plantillaId: null,
                    }),
                }
            );

            if (!data.ok || !data.borrador) {
                throw new Error(data.error ?? "No se pudo generar el borrador.");
            }

            onBorradorGenerado(
                { ...data.borrador, plantilla: data.plantilla },
                datosAntecedentes,
                null
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
                            Escribe el <strong>tipo de procedimiento</strong>, el{" "}
                            <strong>lugar</strong> y la <strong>fecha</strong> y,
                            si hay detención, la{" "}
                            <strong>individualización del detenido</strong> y del{" "}
                            <strong>personal aprehensor</strong>. Agrega también{" "}
                            <strong>testigos</strong> y <strong>víctimas</strong>{" "}
                            si los hay.
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
