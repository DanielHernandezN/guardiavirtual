"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { pedirJson } from "@/lib/cliente";
import { ETIQUETA_ROL, type Rol } from "@/lib/usuarios";

type Usuario = {
  id: string;
  nombre: string;
  grado: string | null;
  rol: Rol;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
  casos: number;
};

type Props = {
  /** Nombre del administrador en sesión. */
  nombre: string;
  /** ID del administrador en sesión (no puede desactivarse ni eliminarse). */
  usuarioId: string;
};

const fecha = (iso: string | null): string => {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const campo =
  "w-full rounded-lg border border-oliva-300 bg-oliva-50 px-3 py-2 text-sm text-oliva-900 placeholder:text-oliva-500 outline-none transition focus:border-oliva-500 focus:ring-2 focus:ring-oliva-500/25";

const botonSecundario =
  "rounded-lg border border-oliva-300 px-3 py-1.5 text-xs font-semibold text-oliva-700 transition hover:bg-oliva-200 disabled:opacity-60";

/**
 * Panel de administración de funcionarios.
 *
 * El administrador crea funcionarios con su contraseña inicial, restablece
 * contraseñas, activa o desactiva accesos y elimina cuentas sin historial.
 * Los casos guardados nunca se pierden: para eso se desactiva en vez de borrar.
 */
export default function UsuariosPanel({ nombre, usuarioId }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Formulario de alta.
  const [id, setId] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [grado, setGrado] = useState("");
  const [rol, setRol] = useState<Rol>("FUNCIONARIO");
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");

  // Restablecimiento de contraseña (por funcionario).
  const [clavePara, setClavePara] = useState<string | null>(null);
  const [claveNueva, setClaveNueva] = useState("");

  // Edición de nombre, grado y rol (por funcionario).
  const [editando, setEditando] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<{
    nombre: string;
    grado: string;
    rol: Rol;
  }>({ nombre: "", grado: "", rol: "FUNCIONARIO" });

  const obtenerUsuarios = useCallback(async (): Promise<Usuario[]> => {
    const data = await pedirJson<{ usuarios?: Usuario[] }>("/api/usuarios");
    return Array.isArray(data.usuarios) ? data.usuarios : [];
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      setUsuarios(await obtenerUsuarios());
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo cargar la lista de funcionarios."
      );
    } finally {
      setCargando(false);
    }
  }, [obtenerUsuarios]);

  useEffect(() => {
    let activo = true;

    void obtenerUsuarios()
      .then((lista) => {
        if (activo) setUsuarios(lista);
      })
      .catch((fallo: unknown) => {
        if (activo) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar la lista de funcionarios."
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [obtenerUsuarios]);

  const limpiarFormulario = () => {
    setId("");
    setNombreNuevo("");
    setGrado("");
    setRol("FUNCIONARIO");
    setPassword("");
    setRepetir("");
  };

  const crear = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError("");
    setAviso("");

    if (password !== repetir) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setOcupado("crear");

    try {
      await pedirJson("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({
          id,
          nombre: nombreNuevo,
          grado: grado || null,
          rol,
          password,
        }),
      });

      setAviso(`Funcionario "${nombreNuevo.trim()}" creado.`);
      limpiarFormulario();
      await cargar();
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo crear el funcionario."
      );
    } finally {
      setOcupado(null);
    }
  };

  const ejecutar = async (
    clave: string,
    peticion: () => Promise<unknown>,
    mensajeExito: string
  ) => {
    setError("");
    setAviso("");
    setOcupado(clave);

    try {
      await peticion();
      setAviso(mensajeExito);
      await cargar();
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo completar la acción."
      );
    } finally {
      setOcupado(null);
    }
  };

  const cambiarEstado = (usuario: Usuario) =>
    ejecutar(
      `estado:${usuario.id}`,
      () =>
        pedirJson(`/api/usuarios/${usuario.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            accion: usuario.activo ? "desactivar" : "activar",
          }),
        }),
      usuario.activo
        ? `Acceso de "${usuario.nombre}" desactivado.`
        : `Acceso de "${usuario.nombre}" reactivado.`
    );

  const restablecer = async (usuario: Usuario) => {
    if (claveNueva.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    await ejecutar(
      `clave:${usuario.id}`,
      () =>
        pedirJson(`/api/usuarios/${usuario.id}`, {
          method: "PATCH",
          body: JSON.stringify({ accion: "password", password: claveNueva }),
        }),
      `Contraseña de "${usuario.nombre}" restablecida.`
    );

    setClavePara(null);
    setClaveNueva("");
  };

  const abrirEdicion = (usuario: Usuario) => {
    setClavePara(null);
    setClaveNueva("");
    setError("");
    setEditando(editando === usuario.id ? null : usuario.id);
    setEdicion({
      nombre: usuario.nombre,
      grado: usuario.grado ?? "",
      rol: usuario.rol,
    });
  };

  const guardarEdicion = async (usuario: Usuario) => {
    await ejecutar(
      `editar:${usuario.id}`,
      () =>
        pedirJson(`/api/usuarios/${usuario.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            accion: "actualizar",
            nombre: edicion.nombre,
            grado: edicion.grado || null,
            rol: edicion.rol,
          }),
        }),
      `Datos de "${usuario.nombre}" actualizados.`
    );

    setEditando(null);
  };

  const eliminar = (usuario: Usuario) => {
    if (
      !window.confirm(
        `¿Eliminar definitivamente a "${usuario.nombre}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    void ejecutar(
      `eliminar:${usuario.id}`,
      () =>
        pedirJson(`/api/usuarios/${usuario.id}`, { method: "DELETE" }),
      `Funcionario "${usuario.nombre}" eliminado.`
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-oliva-900">
            Administración de funcionarios
          </h1>
          <p className="mt-1 text-sm text-oliva-600">
            Sesión de <strong>{nombre}</strong> · administrador
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-oliva-300 bg-oliva-50 px-3 py-2 text-sm font-semibold text-oliva-700 transition hover:bg-oliva-200"
        >
          ← Volver al parte
        </Link>
      </header>

      {error && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      {aviso && (
        <p className="rounded-xl border border-oliva-300 bg-oliva-50 px-4 py-3 text-sm font-semibold text-oliva-800">
          {aviso}
        </p>
      )}

      {/* Alta de funcionario */}
      <section className="rounded-2xl border border-oliva-200 bg-oliva-50 p-4 sm:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-oliva-500">
          Nuevo funcionario
        </h2>

        <form onSubmit={crear} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-oliva-700">
            ID de acceso
            <input
              className={campo}
              value={id}
              onChange={(evento) => setId(evento.target.value)}
              placeholder="daniel.hernandez"
              autoComplete="off"
              required
            />
            <span className="text-[11px] font-normal text-oliva-500">
              Minúsculas, números, punto o guion. No se puede cambiar después.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-oliva-700">
            Nombre completo
            <input
              className={campo}
              value={nombreNuevo}
              onChange={(evento) => setNombreNuevo(evento.target.value)}
              placeholder="Daniel Hernández Norambuena"
              autoComplete="off"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-oliva-700">
            Grado (opcional)
            <input
              className={campo}
              value={grado}
              onChange={(evento) => setGrado(evento.target.value)}
              placeholder="Sgto. 1ro."
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-oliva-700">
            Rol
            <select
              className={campo}
              value={rol}
              onChange={(evento) => setRol(evento.target.value as Rol)}
            >
              <option value="FUNCIONARIO">Funcionario</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-oliva-700">
            Contraseña inicial
            <input
              className={campo}
              type="password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-oliva-700">
            Repetir contraseña
            <input
              className={campo}
              type="password"
              value={repetir}
              onChange={(evento) => setRepetir(evento.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={ocupado === "crear"}
              className="w-full rounded-xl bg-oliva-600 px-6 py-3 text-sm font-semibold text-oliva-50 transition hover:bg-oliva-700 disabled:opacity-60 sm:w-auto"
            >
              {ocupado === "crear" ? "CREANDO..." : "CREAR FUNCIONARIO"}
            </button>
          </div>
        </form>
      </section>

      {/* Listado */}
      <section className="rounded-2xl border border-oliva-200 bg-oliva-50 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-oliva-500">
            Funcionarios
            <span className="ml-2 font-normal normal-case text-oliva-500">
              {usuarios.length} total
            </span>
          </h2>
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={cargando}
            className={botonSecundario}
          >
            {cargando ? "CARGANDO..." : "Actualizar"}
          </button>
        </div>

        {cargando && usuarios.length === 0 ? (
          <p className="mt-4 text-sm text-oliva-600">Cargando funcionarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="mt-4 text-sm text-oliva-600">
            Todavía no hay funcionarios. Cree el primero con el formulario de
            arriba.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {usuarios.map((usuario) => {
              const esUno = usuario.id === usuarioId;

              return (
                <li
                  key={usuario.id}
                  className="rounded-xl border border-oliva-200 bg-white/60 px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-oliva-900">
                        {usuario.nombre}
                        {esUno && (
                          <span className="ml-2 rounded bg-oliva-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-oliva-700">
                            tú
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-oliva-600">
                        {usuario.id}
                        {usuario.grado ? ` · ${usuario.grado}` : ""} ·{" "}
                        {ETIQUETA_ROL[usuario.rol]} ·{" "}
                        {usuario.activo ? "activo" : "sin acceso"}
                        {usuario.casos > 0
                          ? ` · ${usuario.casos} caso${usuario.casos > 1 ? "s" : ""}`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] text-oliva-500">
                        Último acceso: {fecha(usuario.ultimoAcceso)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => abrirEdicion(usuario)}
                        className={botonSecundario}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditando(null);
                          setClavePara(
                            clavePara === usuario.id ? null : usuario.id
                          );
                          setClaveNueva("");
                          setError("");
                        }}
                        className={botonSecundario}
                      >
                        Contraseña
                      </button>

                      <button
                        type="button"
                        onClick={() => void cambiarEstado(usuario)}
                        disabled={esUno || ocupado === `estado:${usuario.id}`}
                        title={
                          esUno
                            ? "No puede desactivar su propia cuenta"
                            : undefined
                        }
                        className={botonSecundario}
                      >
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminar(usuario)}
                        disabled={esUno || ocupado === `eliminar:${usuario.id}`}
                        title={
                          esUno
                            ? "No puede eliminar su propia cuenta"
                            : usuario.casos > 0
                            ? "Tiene casos guardados: desactívelo en vez de eliminarlo"
                            : undefined
                        }
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {editando === usuario.id && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-oliva-200 pt-3 sm:flex-row sm:items-end">
                      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-oliva-700">
                        Nombre completo
                        <input
                          className={campo}
                          value={edicion.nombre}
                          onChange={(evento) =>
                            setEdicion((actual) => ({
                              ...actual,
                              nombre: evento.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="flex w-full flex-col gap-1 text-xs font-semibold text-oliva-700 sm:w-40">
                        Grado
                        <input
                          className={campo}
                          value={edicion.grado}
                          onChange={(evento) =>
                            setEdicion((actual) => ({
                              ...actual,
                              grado: evento.target.value,
                            }))
                          }
                          placeholder="Sgto. 1ro."
                        />
                      </label>

                      <label className="flex w-full flex-col gap-1 text-xs font-semibold text-oliva-700 sm:w-40">
                        Rol
                        <select
                          className={campo}
                          value={edicion.rol}
                          onChange={(evento) =>
                            setEdicion((actual) => ({
                              ...actual,
                              rol: evento.target.value as Rol,
                            }))
                          }
                        >
                          <option value="FUNCIONARIO">Funcionario</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </label>

                      <button
                        type="button"
                        onClick={() => void guardarEdicion(usuario)}
                        disabled={ocupado === `editar:${usuario.id}`}
                        className="rounded-lg bg-oliva-600 px-4 py-2 text-xs font-semibold text-oliva-50 transition hover:bg-oliva-700 disabled:opacity-60"
                      >
                        {ocupado === `editar:${usuario.id}`
                          ? "GUARDANDO..."
                          : "GUARDAR"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditando(null)}
                        className={botonSecundario}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {clavePara === usuario.id && (
                    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-oliva-200 pt-3">
                      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-oliva-700">
                        Nueva contraseña
                        <input
                          className={campo}
                          type="password"
                          value={claveNueva}
                          onChange={(evento) => setClaveNueva(evento.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          autoComplete="new-password"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void restablecer(usuario)}
                        disabled={ocupado === `clave:${usuario.id}`}
                        className="rounded-lg bg-oliva-600 px-4 py-2 text-xs font-semibold text-oliva-50 transition hover:bg-oliva-700 disabled:opacity-60"
                      >
                        {ocupado === `clave:${usuario.id}`
                          ? "GUARDANDO..."
                          : "GUARDAR"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClavePara(null);
                          setClaveNueva("");
                        }}
                        className={botonSecundario}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-xs leading-relaxed text-oliva-500">
          Desactivar quita el acceso sin borrar los casos del funcionario.
          Eliminar solo es posible si no tiene casos guardados.
        </p>
      </section>
    </div>
  );
}
