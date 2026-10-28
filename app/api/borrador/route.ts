import { camposFaltantes, esDetencion } from "@/lib/antecedentes";
import { obtenerSesion } from "@/lib/auth-server";
import { errorComoJson } from "@/lib/errores";
import { fechaYHoraDeHoy } from "@/lib/fecha";
import { ERROR_SIN_CLAVE, hayClaveDeIA, llamarModeloJson } from "@/lib/ia";
import { registrarUso } from "@/lib/limites";
import {
  PROMPT_REDAR_PARTE,
  construirMensajeBorrador,
} from "@/lib/prompts";
import {
  TITULO_ENCABEZADO,
  TITULO_INSTRUCCIONES,
  TITULO_PIE,
  TITULO_RELATO,
  TITULO_SITUACION,
  componerTextoParte,
  construirInstruccionesFiscal,
  construirMembrete,
  construirPieParte,
  seccionesPara,
  tituloPorTipo,
} from "@/lib/plantillas";
import { esquemaAntecedentes, esquemaBorrador } from "@/lib/schemas";
import type { BorradorParte, SeccionBorrador } from "@/lib/types";
import { leerJsonLimitado } from "@/lib/validacion";

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) {
      return Response.json({ ok: false, error: "No autenticado." }, { status: 401 });
    }

    // La redacción consume una llamada al modelo: comparte el límite con
    // `/api/chat` (misma cuota del proveedor).
    const limite = registrarUso(`ia:${sesion.id}`);
    if (!limite.permitido) {
      return Response.json(
        {
          ok: false,
          error: `Demasiadas solicitudes seguidas. Intente de nuevo en ${limite.reintentoEnSegundos} segundos.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limite.reintentoEnSegundos) },
        }
      );
    }

    const cuerpo = await leerJsonLimitado(request);
    if (!cuerpo.ok) {
      return Response.json(
        {
          ok: false,
          error:
            cuerpo.motivo === "tamaño"
              ? "La solicitud es demasiado grande."
              : "El cuerpo de la solicitud no es JSON válido.",
        },
        { status: cuerpo.motivo === "tamaño" ? 413 : 400 }
      );
    }

    const datos = cuerpo.datos as Record<string, unknown>;
    const antecedentesEntrada =
      datos?.antecedentes &&
      typeof datos.antecedentes === "object" &&
      !Array.isArray(datos.antecedentes)
        ? (datos.antecedentes as Record<string, unknown>)
        : {};

    const antecedentes = esquemaAntecedentes.parse(antecedentesEntrada);

    // Solo se confecciona el borrador si están todos los campos obligatorios.
    const faltantes = camposFaltantes(antecedentes);
    if (faltantes.length > 0) {
      return Response.json(
        {
          ok: false,
          error:
            "Faltan antecedentes obligatorios para confeccionar el borrador.",
          faltantes,
        },
        { status: 400 }
      );
    }

    // Las contradicciones bloquean el borrador: no se puede redactar un
    // parte que mezcle dos procedimientos distintos.
    if (antecedentes.contradicciones.length > 0) {
      return Response.json(
        {
          ok: false,
          error:
            "Hay contradicciones en los antecedentes: no se puede confeccionar un parte con dos procedimientos distintos.",
          contradicciones: antecedentes.contradicciones,
        },
        { status: 409 }
      );
    }

    if (!hayClaveDeIA()) {
      return Response.json(
        { ok: false, error: ERROR_SIN_CLAVE },
        { status: 500 }
      );
    }

    const detencion = esDetencion(antecedentes);
    const secciones = seccionesPara(
      detencion,
      antecedentes.tipoProcedimiento
    );
    const { fecha } = fechaYHoraDeHoy();
    const comuna = process.env.UNIDAD_COMUNA?.trim() || null;

    const validados = esquemaBorrador.parse(
      await llamarModeloJson(
        [
          { role: "system", content: PROMPT_REDAR_PARTE },
          {
            role: "user",
            content: construirMensajeBorrador(
              antecedentes,
              secciones,
              detencion,
              fecha,
              comuna
            ),
          },
        ],
        {
          temperatura: 0,
          modelo: process.env.AI_MODEL_REDACCION,
          timeoutMs: 60_000,
        }
      )
    );
    const titulo = tituloPorTipo(
      antecedentes.tipoProcedimiento,
      detencion
    );

    // El membrete es fijo y lo arma el servidor (no el modelo): así la
    // prefectura y la unidad no dependen de la IA.
    const membrete = construirMembrete({
      prefectura: process.env.UNIDAD_PREFECTURA ?? null,
      unidad: process.env.UNIDAD_NOMBRE ?? null,
    });

    // El modelo devuelve solo las secciones con datos; el servidor agrega las
    // que se construyen con datos estructurados (fiscal, situación, firmas).
    const seccionesModelo = validados.secciones.filter(
      (seccion) =>
        seccion.titulo !== TITULO_ENCABEZADO &&
        seccion.titulo !== TITULO_PIE &&
        seccion.contenido.trim().length > 0
    );

    if (
      !seccionesModelo.some((seccion) => seccion.titulo === TITULO_RELATO)
    ) {
      seccionesModelo.unshift({
        titulo: TITULO_RELATO,
        contenido: antecedentes.descripcionHechos ?? "",
      });
    }

    const instrucciones = construirInstruccionesFiscal(antecedentes.fiscal);
    const textoSituacion = antecedentes.detencion.situacion?.trim();
    const situacion =
      detencion && textoSituacion
        ? textoSituacion.charAt(0).toUpperCase() + textoSituacion.slice(1)
        : null;

    // Firmas: el personal a cargo; si no se informó, el funcionario en sesión.
    const funcionariosFirma =
      antecedentes.funcionarios.length > 0
        ? antecedentes.funcionarios
        : [{ grado: sesion.grado ?? null, nombre: sesion.nombre }];

    const seccionesBorrador: SeccionBorrador[] = [
      ...(membrete
        ? [{ titulo: TITULO_ENCABEZADO, contenido: membrete }]
        : []),
      ...seccionesModelo,
      ...(instrucciones
        ? [{ titulo: TITULO_INSTRUCCIONES, contenido: instrucciones }]
        : []),
      ...(situacion
        ? [{ titulo: TITULO_SITUACION, contenido: situacion }]
        : []),
      {
        titulo: TITULO_PIE,
        contenido: construirPieParte(funcionariosFirma),
      },
    ];

    const borrador: BorradorParte = {
      titulo,
      secciones: seccionesBorrador,
      textoCompleto: componerTextoParte(titulo, seccionesBorrador),
      generadoEn: new Date().toISOString(),
    };

    return Response.json({ ok: true, borrador });
  } catch (error) {
    const { status, body } = errorComoJson(error);
    return Response.json({ ok: false, error: body.error }, { status });
  }
}
