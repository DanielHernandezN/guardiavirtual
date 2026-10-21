"use client"

import React from "react";
import { useState, useEffect, useRef } from "react";
import { camposFaltantes, puedeRedactarBorrador } from "@/lib/antecedentes";
import type { Antecedentes, BorradorParte, ResultadoAnalisis } from "@/lib/types";
import EstadoCaso from "./EstadoCaso";

type Props = {
  /** Notifica que se generó un borrador para mostrarlo en el visor. */
  onBorradorGenerado: (
    borrador: BorradorParte,
    antecedentes: Antecedentes
  ) => void;
};

export default function Chat({ onBorradorGenerado }: Props) {

    type Mensaje = {
        contenido: string;
        autor: string;
    };

    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [antecedentes, setAntecedentes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [datosAntecedentes, setDatosAntecedentes] = useState<Antecedentes>({
        tipoProcedimiento: null,
        especie: null,
        lugar: null,
        fecha: null,
        descripcionHechos: null,
        contradicciones: [],
    });
    const [borradorCargando, setBorradorCargando] = useState(false);

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

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data: ResultadoAnalisis & { error?: string } = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Error al procesar el caso.");
            }

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
                    autor: "cabo"
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerarBorrador = async () => {
        setBorradorCargando(true);
        try {
            const response = await fetch("/api/borrador", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ antecedentes: datosAntecedentes }),
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.error ?? "No se pudo generar el borrador.");
            }

            onBorradorGenerado(data.borrador, datosAntecedentes);
        } catch (error) {
            setMensajes((mensajesActuales) => [
                ...mensajesActuales,
                {
                    contenido: error instanceof Error ? error.message : "No pude generar el borrador.",
                    autor: "cabo",
                },
            ]);
        } finally {
            setBorradorCargando(false);
        }
    };

    return (
    
    <section className="
          flex
          flex-col
          w-[80%]
          h-screen
          bg-oliva-100
          ">
            <div className="
            flex
            flex-row
            p-6
            justify-between
            border-b
            border-oliva-200
            bg-oliva-50
            ">
              <div>
                <h2 className="text-oliva-900">CABO VIRTUAL</h2>
                <p className="text-sm text-oliva-600">Asistente de apoyo documental</p>
              </div>
                <div className="flex flex-row items-center gap-4">
                  {puedeConfeccionar && (
                    <button
                      type="button"
                      onClick={handleGenerarBorrador}
                      disabled={borradorCargando}
                      className="
                      rounded-xl
                      bg-oliva-600
                      px-4
                      py-2
                      text-sm
                      font-semibold
                      text-oliva-50
                      transition
                      hover:bg-oliva-700
                      disabled:opacity-60
                      "
                    >
                      {borradorCargando ? "GENERANDO..." : "GENERAR BORRADOR"}
                    </button>
                  )}
                  <div className="flex flex-row items-center gap-2 text-sm text-oliva-600">
                    <p className="text-oliva-500">●</p>
                    <p>En línea</p>
                  </div>
                </div>
            </div>

            <div className="
            flex-1 
            p-6
            overflow-y-auto
            ">
                {mensajes.map((mensaje, index) => (
                <div key={index}
                    className={
                        mensaje.autor === "funcionario"
                        ? "flex justify-end"
                        : "flex justify-start"
                }  
                >
                    <div className={
                        mensaje.autor === "funcionario"
                        ? "flex flex-col gap-1 p-4 rounded-xl bg-oliva-200 text-oliva-900 border border-oliva-300"
                        : "flex flex-col gap-1 p-4 rounded-xl bg-oliva-800 text-oliva-50 border border-oliva-700"
                    }>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                        {mensaje.autor}
                    </p>
                    <p>{mensaje.contenido}</p>
                    </div>
                </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-oliva-800 text-oliva-50 border border-oliva-700">
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                                cabo
                            </p>
                            <p>Analizando antecedentes...</p>
                        </div>
                    </div>
                )}

                <div ref={finalMensajes}></div>

            </div>

            <div className="border-t border-oliva-200 bg-oliva-50">
                <EstadoCaso
                    faltantes={camposFaltantes(datosAntecedentes)}
                    contradicciones={datosAntecedentes.contradicciones}
                    onResolver={resolverContradicciones}
                />
            </div>

            <div className="border-t border-oliva-200 bg-oliva-100">
              <form onSubmit={handleSubmit} className="
              flex
              flex-row
              p-6
              gap-3
              "
        
              >
                <input className="
                flex-1
                px-6
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
                "
                placeholder="Escriba los antecedentes"
                value={antecedentes}
                onChange={(e) => setAntecedentes(e.target.value)}
                disabled={isLoading}
                />
                  <button type="submit"
                  className="
                  px-6
                  py-3
                  bg-oliva-600
                  text-oliva-50
                  rounded-xl
                  hover:bg-oliva-700
                  disabled:opacity-60
                  "
                  disabled={isLoading}
                  >{isLoading ? "PROCESANDO..." : "ENVIAR"}</button>
              </form>
            </div>
          </section>
  );
}
