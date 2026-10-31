import { exigirAdministrador } from "@/lib/auth-server";
import { ErrorConflicto, respuestaDeError } from "@/lib/errores";
import {
  actualizarUsuario,
  cambiarPassword,
  eliminarUsuario,
  establecerActivo,
} from "@/lib/usuarios-db";
import {
  esquemaActualizarUsuario,
  esquemaPasswordUsuario,
  idUsuarioValido,
} from "@/lib/usuarios";
import { leerJsonLimitado } from "@/lib/validacion";

/**
 * Funcionario individual — administración.
 *
 * PATCH  → `{"accion":"actualizar", nombre, grado, rol}`
 *          `{"accion":"password", password}`
 *          `{"accion":"activar"}` / `{"accion":"desactivar"}`
 * DELETE → elimina definitivamente (solo si no tiene casos guardados).
 *
 * Solo un administrador activo puede usar estos endpoints, y nunca sobre su
 * propia cuenta para las acciones que le quitarían el acceso.
 */

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/usuarios/[id]">
) {
  const acceso = await exigirAdministrador();

  if (!acceso.ok) return acceso.respuesta;

  const { id } = await ctx.params;

  if (!idUsuarioValido(id)) {
    return Response.json(
      { error: "El funcionario no existe." },
      { status: 404 }
    );
  }

  const cuerpo = await leerJsonLimitado(request, { maximo: 8 * 1024 });

  if (!cuerpo.ok) {
    return Response.json(
      { error: "La solicitud no tiene un formato válido." },
      { status: cuerpo.motivo === "tamaño" ? 413 : 400 }
    );
  }

  const datos = (cuerpo.datos ?? {}) as Record<string, unknown>;
  const accion = typeof datos.accion === "string" ? datos.accion : "";

  try {
    if (accion === "actualizar") {
      const resultado = esquemaActualizarUsuario.safeParse(datos);

      if (!resultado.success) {
        return Response.json(
          {
            error:
              resultado.error.issues[0]?.message ??
              "Los datos del funcionario no son válidos.",
          },
          { status: 400 }
        );
      }

      // Un administrador no puede quitarse a sí mismo el rol si con eso
      // dejaría el sistema sin administradores (lo valida el repositorio).
      const usuario = await actualizarUsuario(id, resultado.data);
      return Response.json({ ok: true, usuario });
    }

    if (accion === "password") {
      const resultado = esquemaPasswordUsuario.safeParse(datos);

      if (!resultado.success) {
        return Response.json(
          {
            error:
              resultado.error.issues[0]?.message ??
              "La contraseña no es válida.",
          },
          { status: 400 }
        );
      }

      await cambiarPassword(id, resultado.data.password);
      return Response.json({ ok: true });
    }

    if (accion === "activar" || accion === "desactivar") {
      const activo = accion === "activar";

      if (!activo && id === acceso.usuarioId) {
        return Response.json(
          { error: "No puede desactivar su propia cuenta." },
          { status: 409 }
        );
      }

      const usuario = await establecerActivo(id, activo);
      return Response.json({ ok: true, usuario });
    }

    return Response.json(
      {
        error:
          "Acción no soportada. Use \"actualizar\", \"password\", \"activar\" o \"desactivar\".",
      },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof ErrorConflicto) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    return respuestaDeError(error, "No se pudo actualizar el funcionario.");
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/usuarios/[id]">
) {
  const acceso = await exigirAdministrador();

  if (!acceso.ok) return acceso.respuesta;

  const { id } = await ctx.params;

  if (!idUsuarioValido(id)) {
    return Response.json(
      { error: "El funcionario no existe." },
      { status: 404 }
    );
  }

  if (id === acceso.usuarioId) {
    return Response.json(
      { error: "No puede eliminar su propia cuenta." },
      { status: 409 }
    );
  }

  try {
    await eliminarUsuario(id);
    return Response.json({ ok: true, eliminado: true });
  } catch (error) {
    if (error instanceof ErrorConflicto) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    return respuestaDeError(error, "No se pudo eliminar el funcionario.");
  }
}
