import { exigirAdministrador } from "@/lib/auth-server";
import { ErrorConflicto, respuestaDeError } from "@/lib/errores";
import { crearUsuario, listarUsuarios } from "@/lib/usuarios-db";
import { esquemaCrearUsuario } from "@/lib/usuarios";
import { leerJsonLimitado } from "@/lib/validacion";

/**
 * Funcionarios — administración.
 *
 * GET  → lista de funcionarios (sin hashes ni contraseñas).
 * POST → da de alta un funcionario con su contraseña inicial.
 *
 * Solo un administrador activo puede usar estos endpoints.
 */

export async function GET() {
  const acceso = await exigirAdministrador();

  if (!acceso.ok) return acceso.respuesta;

  try {
    const usuarios = await listarUsuarios();
    return Response.json({ ok: true, usuarios });
  } catch (error) {
    return respuestaDeError(
      error,
      "No se pudo leer la lista de funcionarios."
    );
  }
}

export async function POST(request: Request) {
  const acceso = await exigirAdministrador();

  if (!acceso.ok) return acceso.respuesta;

  const cuerpo = await leerJsonLimitado(request, { maximo: 8 * 1024 });

  if (!cuerpo.ok) {
    return Response.json(
      { error: "La solicitud no tiene un formato válido." },
      { status: cuerpo.motivo === "tamaño" ? 413 : 400 }
    );
  }

  const resultado = esquemaCrearUsuario.safeParse(cuerpo.datos);

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

  try {
    const usuario = await crearUsuario(resultado.data);
    return Response.json({ ok: true, usuario }, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorConflicto) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    return respuestaDeError(error, "No se pudo crear el funcionario.");
  }
}
