/**
 * Errores controlados — Guardia Virtual
 * ─────────────────────────────────────
 * Traduce los fallos técnicos (red, modelo, base de datos) a mensajes
 * comprensibles para el funcionario y a códigos HTTP correctos.
 *
 * Regla del dominio: **nunca se inventan datos**. Si algo falla, se informa
 * del fallo; no se rellena el hueco con suposiciones.
 */

/** Error lanzado cuando la llamada al modelo excede el tiempo máximo. */
export class ErrorTiempoAgotado extends Error {
  constructor(mensaje = "El modelo de IA tardó demasiado en responder.") {
    super(mensaje);
    this.name = "ErrorTiempoAgotado";
  }
}

/** Error lanzado cuando el proveedor rechaza la solicitud por límite de uso. */
export class ErrorLimiteProveedor extends Error {
  constructor(
    mensaje = "Se alcanzó el límite de uso del proveedor de IA. Intente en unos minutos."
  ) {
    super(mensaje);
    this.name = "ErrorLimiteProveedor";
  }
}

/** Error de validación de la entrada recibida del cliente. */
export class ErrorEntradaInvalida extends Error {
  readonly detalles: string[];

  constructor(mensaje: string, detalles: string[] = []) {
    super(mensaje);
    this.name = "ErrorEntradaInvalida";
    this.detalles = detalles;
  }
}

/**
 * Convierte un error desconocido en un mensaje apto para mostrar en la UI.
 * Los errores técnicos se ocultan: el funcionario ve qué pasó, no el
 * volcado de la excepción.
 */
export const mensajeAmigable = (error: unknown): string => {
  if (error instanceof ErrorTiempoAgotado) return error.message;
  if (error instanceof ErrorLimiteProveedor) return error.message;
  if (error instanceof ErrorEntradaInvalida) return error.message;

  if (error instanceof Error) {
    // Errores de Zod: se resume la causa sin volcar el esquema.
    if (error.name === "ZodError") {
      return "Los datos recibidos no tienen el formato esperado.";
    }

    // Errores de red (fetch): no hay conexión con el proveedor.
    if (
      error.message.includes("fetch failed") ||
      error.message.includes("network") ||
      error.message.includes("ECONNREFUSED")
    ) {
      return "No se pudo conectar con el servicio de IA. Revise la conexión e intente de nuevo.";
    }

    // Errores ya traducidos por la capa de IA.
    if (error.message.startsWith("La API de IA")) {
      return "El servicio de IA rechazó la solicitud. Intente de nuevo en unos minutos.";
    }

    if (error.message.includes("no se pudo parsear")) {
      return "El modelo devolvió una respuesta ilegible. Intente de nuevo.";
    }

    if (error.message.includes("no incluye contenido")) {
      return "El modelo devolvió una respuesta vacía. Intente de nuevo.";
    }
  }

  return "Ocurrió un error inesperado. Intente de nuevo.";
};

/** Mensaje genérico por defecto para errores internos no controlados. */
export const ERROR_INTERNO =
  "Ocurrió un error inesperado al procesar la solicitud.";

/**
 * Traduce una excepción al cuerpo y al código HTTP correctos.
 * Devuelve datos (no una `Response`) para que cada endpoint elija su
 * envoltorio: `{ error }` o `{ ok: false, error }`.
 */
export const errorComoJson = (
  error: unknown,
  mensajePorDefecto = ERROR_INTERNO
): { status: number; body: { error: string } } => {
  if (error instanceof ErrorEntradaInvalida) {
    return { status: 400, body: { error: error.message } };
  }

  if (error instanceof ErrorLimiteProveedor) {
    return { status: 429, body: { error: error.message } };
  }

  if (error instanceof ErrorTiempoAgotado) {
    return { status: 504, body: { error: error.message } };
  }

  return {
    status: 500,
    body: { error: mensajeAmigable(error) || mensajePorDefecto },
  };
};

/**
 * Convierte una excepción en una respuesta HTTP con el código correcto.
 *
 * - 400: entrada inválida.
 * - 429: el proveedor de IA agotó su cuota.
 * - 504: el modelo no respondió a tiempo.
 * - 500: cualquier otro fallo.
 */
export const respuestaDeError = (
  error: unknown,
  mensajePorDefecto = ERROR_INTERNO
): Response => {
  const { status, body } = errorComoJson(error, mensajePorDefecto);

  const cabeceras: Record<string, string> = {};
  if (status === 429) cabeceras["Retry-After"] = "60";

  return Response.json(body, { status, headers: cabeceras });
};


