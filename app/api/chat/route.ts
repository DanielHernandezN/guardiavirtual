import {
  camposFaltantes,
  combinarDatos,
  combinarFiscal,
  combinarFuncionarios,
  crearRespuestaConversacional,
} from "@/lib/antecedentes";
import { obtenerSesion } from "@/lib/auth-server";
import { ErrorEntradaInvalida, respuestaDeError } from "@/lib/errores";
import { fechaDeHoy } from "@/lib/fecha";
import { ERROR_SIN_CLAVE, hayClaveDeIA, llamarModeloJson } from "@/lib/ia";
import { registrarUso } from "@/lib/limites";
import { PROMPT_EXTRAER_ANTECEDENTES, construirMensajeUsuario } from "@/lib/prompts";
import {
  esquemaAntecedentes,
  esquemaRespuestaModelo,
  type RespuestaModelo,
} from "@/lib/schemas";
import { dividirEnTrozos } from "@/lib/trozos";
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

    /**
     * Acumula la respuesta del modelo sobre el estado previo.
     * - `reiniciar`: el mensaje describe otro procedimiento, así que el
     *   estado se reemplaza para que el caso nuevo no herede datos.
     * - Si no, se conserva lo ya conocido cuando el modelo devuelve `null`.
     */
    const combinar = (
      previos: Antecedentes,
      validados: RespuestaModelo,
      reiniciar: boolean
    ): Antecedentes =>
      reiniciar
        ? {
            tipoProcedimiento: validados.tipoProcedimiento,
            especie: validados.especie,
            lugar: validados.lugar,
            fecha: validados.fecha,
            descripcionHechos: validados.descripcionHechos ?? mensaje,
            detenido: validados.detenido,
            detencion: validados.detencion,
            funcionarios: validados.funcionarios,
            fiscal: validados.fiscal,
            contradicciones: validados.contradicciones,
          }
        : {
            tipoProcedimiento:
              validados.tipoProcedimiento ?? previos.tipoProcedimiento,
            especie: validados.especie ?? previos.especie,
            lugar: validados.lugar ?? previos.lugar,
            fecha: validados.fecha ?? previos.fecha,
            descripcionHechos:
              validados.descripcionHechos ??
              previos.descripcionHechos ??
              mensaje,
            detenido: combinarDatos(validados.detenido, previos.detenido),
            detencion: combinarDatos(validados.detencion, previos.detencion),
            funcionarios: combinarFuncionarios(
              validados.funcionarios,
              previos.funcionarios
            ),
            fiscal: combinarFiscal(validados.fiscal, previos.fiscal),
            contradicciones: validados.contradicciones,
          };

    // Un acta completa puede superar el tamaño que el modelo procesa bien:
    // se envía por trozos, acumulando el estado como en mensajes sucesivos.
    const trozos = dividirEnTrozos(mensaje);
    const hoy = fechaDeHoy();
    let antecedentes: Antecedentes = antecedentesPrevios;
    let cambioDeProcedimiento = false;

    for (const [indice, trozo] of trozos.entries()) {
      const validados = esquemaRespuestaModelo.parse(
        await llamarModeloJson(
          [
            { role: "system", content: PROMPT_EXTRAER_ANTECEDENTES },
            {
              role: "user",
              content: construirMensajeUsuario(antecedentes, trozo, hoy),
            },
          ],
          // Extracción interactiva: no se deja al funcionario esperando
          // más de ~3 minutos por trozo (90 s por intento, dos intentos).
          { timeoutMs: 90_000, intentos: 2 }
        )
      );

      // Solo el primer trozo puede cambiar de procedimiento: los siguientes
      // son continuación del mismo documento.
      const reiniciar =
        indice === 0 && validados.cambioDeProcedimiento;

      if (indice === 0) {
        cambioDeProcedimiento = validados.cambioDeProcedimiento;
      }

      antecedentes = combinar(antecedentes, validados, reiniciar);
    }

    const faltantes = camposFaltantes(antecedentes);

    const resultado: ResultadoAnalisis = {
      respuesta: crearRespuestaConversacional(faltantes),
      ...antecedentes,
      puedeConfeccionarBorrador: faltantes.length === 0,
      faltantes,
      cambioDeProcedimiento,
    };

    return Response.json(resultado);
  } catch (error) {
    return respuestaDeError(error);
  }
}
