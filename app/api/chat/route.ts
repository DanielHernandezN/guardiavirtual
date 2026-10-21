import { camposFaltantes, crearRespuestaConversacional } from "@/lib/antecedentes";
import { obtenerSesion } from "@/lib/auth-server";
import { ErrorEntradaInvalida, respuestaDeError } from "@/lib/errores";
import { ERROR_SIN_CLAVE, hayClaveDeIA, llamarModeloJson } from "@/lib/ia";
import { registrarUso } from "@/lib/limites";
import { PROMPT_EXTRAER_ANTECEDENTES, construirMensajeUsuario } from "@/lib/prompts";
import { esquemaAntecedentes, esquemaRespuestaModelo } from "@/lib/schemas";
import type { Antecedentes, ResultadoAnalisis } from "@/lib/types";
import { esquemaMensaje, leerJsonLimitado } from "@/lib/validacion";

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) {
      return Response.json({ error: "No autenticado." }, { status: 401 });
    }

    const cuerpo = await leerJsonLimitado(request);
    if (!cuerpo.ok) {
      return Response.json(
        {
          error:
            cuerpo.motivo === "tamaño"
              ? "La solicitud es demasiado grande."
              : "El cuerpo de la solicitud no es JSON válido.",
        },
        { status: cuerpo.motivo === "tamaño" ? 413 : 400 }
      );
    }

    const datos = cuerpo.datos as Record<string, unknown>;
    const mensajeValidado = esquemaMensaje.safeParse({
      mensaje: typeof datos?.mensaje === "string" ? datos.mensaje : "",
    });

    if (!mensajeValidado.success) {
      throw new ErrorEntradaInvalida(
        mensajeValidado.error.issues[0]?.message ?? "Mensaje inválido."
      );
    }

    const mensaje = mensajeValidado.data.mensaje;

    // Límite de uso por funcionario: el chat consume llamadas al modelo.
    // Se comprueba **después** de validar, para que una petición inválida
    // no consuma cuota. El límite es compartido con `/api/borrador` porque
    // ambos consumen la misma cuota del proveedor.
    const limite = registrarUso(`ia:${sesion.id}`);
    if (!limite.permitido) {
      return Response.json(
        {
          error: `Demasiadas consultas seguidas. Intente de nuevo en ${limite.reintentoEnSegundos} segundos.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limite.reintentoEnSegundos) },
        }
      );
    }

    const antecedentesEntrada =
      datos?.antecedentes &&
      typeof datos.antecedentes === "object" &&
      !Array.isArray(datos.antecedentes)
        ? (datos.antecedentes as Record<string, unknown>)
        : {};

    if (!hayClaveDeIA()) {
      return Response.json({ error: ERROR_SIN_CLAVE }, { status: 500 });
    }

    // Normaliza y valida los antecedentes acumulados que envía el cliente.
    const antecedentesPrevios = esquemaAntecedentes.parse(antecedentesEntrada);

    const validados = esquemaRespuestaModelo.parse(
      await llamarModeloJson([
        { role: "system", content: PROMPT_EXTRAER_ANTECEDENTES },
        {
          role: "user",
          content: construirMensajeUsuario(antecedentesPrevios, mensaje),
        },
      ])
    );

    const antecedentes: Antecedentes = validados.cambioDeProcedimiento
      ? // El mensaje describe otro procedimiento: se reemplaza el estado
        // acumulado, para que el caso nuevo no herede datos del anterior.
        {
          tipoProcedimiento: validados.tipoProcedimiento,
          especie: validados.especie,
          lugar: validados.lugar,
          fecha: validados.fecha,
          descripcionHechos: validados.descripcionHechos ?? mensaje,
          contradicciones: validados.contradicciones,
        }
      : // Mismo procedimiento: se conserva lo ya conocido cuando el modelo
        // devuelve null.
        {
          tipoProcedimiento:
            validados.tipoProcedimiento ?? antecedentesPrevios.tipoProcedimiento,
          especie: validados.especie ?? antecedentesPrevios.especie,
          lugar: validados.lugar ?? antecedentesPrevios.lugar,
          fecha: validados.fecha ?? antecedentesPrevios.fecha,
          descripcionHechos:
            validados.descripcionHechos ??
            antecedentesPrevios.descripcionHechos ??
            mensaje,
          contradicciones: validados.contradicciones,
        };

    const faltantes = camposFaltantes(antecedentes);

    const resultado: ResultadoAnalisis = {
      respuesta: crearRespuestaConversacional(faltantes),
      ...antecedentes,
      puedeConfeccionarBorrador: faltantes.length === 0,
      faltantes,
      cambioDeProcedimiento: validados.cambioDeProcedimiento,
    };

    return Response.json(resultado);
  } catch (error) {
    return respuestaDeError(error);
  }
}
