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
    }
    

    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [antecedentes, setAntecedentes] = useState("");
    const finalMensajes = useRef<HTMLDivElement>(null);
        useEffect(() => {
            finalMensajes.current?.scrollIntoView({
                behavior: "smooth"
            });
        }, [mensajes]);

    const responderCabo = (texto: string) => {
            let respuesta = "";
            let tipoProcedimiento = "";
            let especie = "";
            let lugar ="";
    

                if (
                    texto.toLowerCase().includes("hurt")||
                    texto.toLowerCase().includes("sustracción")
                ){
                    tipoProcedimiento = "hurto";
                    
                } else if (texto.toLowerCase().includes("rob")){
                    tipoProcedimiento = "robo";
  
                }                 
                else {
                    tipoProcedimiento = "otro";
                } 
                if (
                    texto.toLowerCase().includes("bicicleta")){
                    especie = "bicicleta";
                    }
                if (texto.toLowerCase().includes("supermercado")) {
                    lugar = "supermercado";
}
            const datos: Antecedentes = {
                tipoProcedimiento: tipoProcedimiento,
                especie: especie,
                lugar: lugar,
    }

                
                console.log(datos);
;


                if (tipoProcedimiento === "hurto") {
                        respuesta = "He identificado que los antecedentes hacen referencia a un procedimiento por hurto.";
                } else if (tipoProcedimiento === "robo") {
                        respuesta = "He identificado que los antecedentes hacen referencia a un procedimiento por robo.";
                } else {
                        respuesta = "He recibido los antecedentes y estoy listo para analizarlos.";
                }


                console.log(tipoProcedimiento);
                console.log(especie);
                console.log(lugar);
            
            setMensajes((mensajesActuales) => [
        ...mensajesActuales,
        {
            contenido: respuesta,
            autor: "cabo"
        }
    ]);

    console.log(texto);
}



    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if(!antecedentes.trim()){
            return;
        }

        setMensajes([
    ...mensajes,
    {
        contenido: antecedentes,
        autor: "funcionario"
    },
  
]);

        responderCabo(antecedentes);

        console.log(antecedentes)

        setAntecedentes("");

    }

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