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
    }


    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [antecedentes, setAntecedentes] = useState("");
    const [datosAntecedentes, setDatosAntecedentes] = useState<Antecedentes>({
        tipoProcedimiento: "",
        especie: "",
        lugar: "",
        fecha: "",
        descripcionHechos: "",
        puedeConfeccionarBorrador: false,
        faltantes: []
    });

    const finalMensajes = useRef<HTMLDivElement>(null);
        useEffect(() => {
            finalMensajes.current?.scrollIntoView({
                behavior: "smooth"
            });
        }, [mensajes]);

    const responderCabo = (texto: string) => {
        const textoLower = texto.toLowerCase();
        const tipoProcedimiento =
            textoLower.includes("hurt") || textoLower.includes("sustracción")
                ? "hurto"
                : textoLower.includes("rob")
                    ? "robo"
                    : datosAntecedentes.tipoProcedimiento;

        const especie = textoLower.includes("bicicleta")
            ? "bicicleta"
            : datosAntecedentes.especie;

        const lugar = textoLower.includes("supermercado")
            ? "supermercado"
            : datosAntecedentes.lugar;

            const fechaEncontrada = textoLower.match(/\d{2}\/\d{2}\/\d{4}/);

            const fecha = fechaEncontrada
                ? fechaEncontrada[0]
                : datosAntecedentes.fecha;

            const descripcionHechos = datosAntecedentes.descripcionHechos
                ? `${datosAntecedentes.descripcionHechos}. ${texto}`
                : texto;

        const faltantes: string[] = [];

        if (!tipoProcedimiento) {
            faltantes.push("tipo de procedimiento");
        }

        if (!especie) {
            faltantes.push("especie");
        }

        if (!lugar) {
            faltantes.push("lugar de ocurrencia");
        }
        if (!fecha) {
            faltantes.push("fecha del procedimiento");
        }
        

        const datosActualizados: Antecedentes = {
            tipoProcedimiento: tipoProcedimiento || "",
            especie: especie || "",
            lugar: lugar || "",
            fecha: fecha || "",
            descripcionHechos: descripcionHechos || "",
            puedeConfeccionarBorrador: Boolean(tipoProcedimiento && especie && lugar && fecha),
            faltantes,
        };

        setDatosAntecedentes(datosActualizados);

        let respuesta = "";

        if (datosActualizados.tipoProcedimiento === "hurto") {
            respuesta = `He identificado un procedimiento por hurto relacionado con una ${datosActualizados.especie}.`;
        } else if (datosActualizados.tipoProcedimiento === "robo") {
            respuesta = `He identificado un procedimiento por robo relacionado con una ${datosActualizados.especie}.`;
        } else {
            respuesta = "He recibido los antecedentes y estoy listo para analizarlos.";
        }

        if (!datosActualizados.puedeConfeccionarBorrador) {
            respuesta += ` Aún falta informar: ${datosActualizados.faltantes.join(", ")}. Con los antecedentes disponibles no es posible confeccionar el borrador.`;
         } else {
            respuesta += ` El hecho habría ocurrido en un ${datosActualizados.lugar}, con fecha ${datosActualizados.fecha}. Con los antecedentes disponibles puedo continuar con la confección del borrador.`;
        }

        setMensajes((mensajesActuales) => [
            ...mensajesActuales,
            {
                contenido: respuesta,
                autor: "cabo"
            }
        ]);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const textoIngresado = antecedentes.trim();

        if (!textoIngresado) {
            return;
        }

        setMensajes((mensajesActuales) => [
            ...mensajesActuales,
            {
                contenido: textoIngresado,
                autor: "funcionario"
            }
        ]);

        responderCabo(textoIngresado);
        setAntecedentes("");
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
                    bg-[#2b47a3]
                    text-white
                    ">
                    <p>{mensaje.autor}</p>
                    <p>{mensaje.contenido}</p>
                    </div>
                </div>
                ))}

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
                
                />
                  <button type="submit"
                  className="
                  px-6
                  py-3
                  bg-[#2b47a3]
                  text-white
                  rounded-xl
                  hover:bg-[#721212]
                  "
                  >ENVIAR</button>
              </form>
            </div>
          </section>
  );
}