"use client"

import React from "react";
import { useState, useEffect, useRef } from "react";
import { camposFaltantes } from "@/lib/antecedentes";
import type { Antecedentes, BorradorParte, ResultadoAnalisis } from "@/lib/types";
import BorradorPanel from "./BorradorPanel";
import EstadoCaso from "./EstadoCaso";

export default function Chat() {

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
    const [borrador, setBorrador] = useState<BorradorParte | null>(null);
    const [borradorCargando, setBorradorCargando] = useState(false);
    const [mostrarBorrador, setMostrarBorrador] = useState(false);

    // El borrador solo está disponible cuando no falta ningún campo obligatorio.
    const puedeConfeccionar = camposFaltantes(datosAntecedentes).length === 0;

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

            setBorrador(data.borrador);
            setMostrarBorrador(true);
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
          bg-[#e7dfddad]
          ">
            <div className="
            flex
            flex-row
            p-6
            justify-between
            border-b
            ">
              <div>
                <h2>CABO VIRTUAL</h2>
                <p>Asistente de apoyo documental</p>
              </div>
                <div className="flex flex-row items-center gap-4">
                  {puedeConfeccionar && (
                    <button
                      type="button"
                      onClick={handleGenerarBorrador}
                      disabled={borradorCargando}
                      className="
                      rounded-xl
                      bg-brand
                      px-4
                      py-2
                      text-sm
                      font-semibold
                      text-white
                      transition
                      hover:bg-brand-dark
                      disabled:opacity-60
                      "
                    >
                      {borradorCargando ? "GENERANDO..." : "GENERAR BORRADOR"}
                    </button>
                  )}
                  <div className="flex flex-row gap-2">
                    <p>●</p>
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
                    <div className="
                    flex
                    flex-col
                    gap-1
                    p-4
                    rounded-xl
                    bg-brand
                    text-white
                    ">
                    <p>{mensaje.autor}</p>
                    <p>{mensaje.contenido}</p>
                    </div>
                </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex flex-col gap-1 p-4 rounded-xl bg-brand text-white">
                            <p>cabo</p>
                            <p>Analizando antecedentes...</p>
                        </div>
                    </div>
                )}

                <div ref={finalMensajes}></div>

            </div>

            <EstadoCaso
                faltantes={camposFaltantes(datosAntecedentes)}
                contradicciones={datosAntecedentes.contradicciones}
            />

            <div>
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
                bg-[#d6d8ffad]
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
                  bg-brand
                  text-white
                  rounded-xl
                  hover:bg-brand-dark
                  disabled:opacity-60
                  "
                  disabled={isLoading}
                  >{isLoading ? "PROCESANDO..." : "ENVIAR"}</button>
              </form>
            </div>
            {mostrarBorrador && borrador && (
                <BorradorPanel
                    borrador={borrador}
                    onCerrar={() => setMostrarBorrador(false)}
                />
            )}
          </section>
  );
}
