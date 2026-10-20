"use client"

import React from "react";
import { useState, useEffect, useRef } from "react";

export default function Chat() {

    type Mensaje = {        
        contenido: string,
        autor: string,
    }

    type Antecedentes = {
        tipoProcedimiento: string,
        especie: string,
        lugar: string,
        fecha: string,
        descripcionHechos: string,
        puedeConfeccionarBorrador: boolean,
        faltantes: string[],
        contradicciones: string[],
    }

    type RespuestaIA = {
        respuesta?: string,
        tipoProcedimiento?: string,
        especie?: string,
        lugar?: string,
        fecha?: string,
        descripcionHechos?: string,
        puedeConfeccionarBorrador?: boolean,
        faltantes?: string[],
        contradicciones?: string[],
        error?: string,
    }

    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [antecedentes, setAntecedentes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [datosAntecedentes, setDatosAntecedentes] = useState<Antecedentes>({
        tipoProcedimiento: "",
        especie: "",
        lugar: "",
        fecha: "",
        descripcionHechos: "",
        puedeConfeccionarBorrador: false,
        faltantes: [],
        contradicciones: []
    });

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

            const data: RespuestaIA = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Error al procesar el caso.");
            }

            if (!data.respuesta) {
                throw new Error("La API no devolvió una respuesta conversacional.");
            }

            const resultado = data.respuesta;

            setDatosAntecedentes((prev) => ({
                ...prev,
                tipoProcedimiento: data.tipoProcedimiento ?? prev.tipoProcedimiento,
                especie: data.especie ?? prev.especie,
                lugar: data.lugar ?? prev.lugar,
                fecha: data.fecha ?? prev.fecha,
                descripcionHechos: data.descripcionHechos ?? prev.descripcionHechos,
                puedeConfeccionarBorrador: data.puedeConfeccionarBorrador ?? prev.puedeConfeccionarBorrador,
                faltantes: data.faltantes ?? prev.faltantes,
                contradicciones: data.contradicciones ?? prev.contradicciones,
            }));

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
                <div className="flex flex-row gap-2">
                  <p>●</p>
                  <p>En línea</p>
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
          </section>
  );
}
