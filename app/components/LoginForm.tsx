"use client"
import { useState } from "react"



export default function LoginForm() {

    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const [mensaje,setMensaje] = useState("");


    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!id || !password){
            setMensaje("Debe ingresar ID y contraseña");
            return;
        }

        setMensaje("Datos recibidos")
    }

    return (

    <div>    

        <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* ID */}
            <div>
              <label
                htmlFor="id"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                ID
              </label>

              <input
                id="id"
                type="text"
                placeholder="Ingrese su ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full rounded-xl border border-slate-500 px-4 py-3
                text-slate-900
                placeholder:text-slate-500 outline-none transition
                focus:border-[#c9654b] focus:ring-2 
                focus:ring-[#c9654b]/20"
              />

            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                PASS
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Ingrese su contraseña"
                className="w-full rounded-xl border border-slate-500 px-4 py-3 
                text-slate-900
                placeholder:text-slate-500 outline-none transition 
                focus:border-[#c9654b] focus:ring-2
                focus:ring-[#c9654b]/20"
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              className="w-full rounded-xl 
              bg-[#2b47a3] px-4 py-3 font-semibold
              text-white transition
              hover:bg-[#721212]"
            >
              INGRESAR
            </button>

          </form>

          {mensaje && (
    <p className="mt-4 text-center text-sm text-slate-600">
        {mensaje}
    </p>
)}

    </div>
    )

}