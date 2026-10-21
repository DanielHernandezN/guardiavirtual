/**
 * Cliente HTTP — Guardia Virtual
 * ───────────────────────────────
 * Ayudas para el frontend: leer respuestas JSON con errores controlados y
 * detectar la sesión expirada.
 */

/** Error de una respuesta HTTP con el mensaje que devuelve el servidor. */
export class ErrorDeApi extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeApi";
    this.status = status;
  }

  /** `true` si la sesión expiró o el acceso fue rechazado. */
  get esSesionInvalida(): boolean {
    return this.status === 401;
  }
}

/**
 * Ejecuta una petición JSON y devuelve los datos.
 *
 * Lanza `ErrorDeApi` con el mensaje del servidor cuando la respuesta no es
 * correcta, para que la interfaz muestre un texto comprensible.
 */
export const pedirJson = async <T>(
  url: string,
  init?: RequestInit
): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ErrorDeApi(0, "No hay conexión con el servidor.");
  }

  let datos: unknown = null;

  try {
    datos = await response.json();
  } catch {
    // La respuesta no era JSON: se usa el código HTTP como mensaje.
  }

  if (!response.ok) {
    const mensaje =
      (datos as { error?: string } | null)?.error ??
      `No se pudo completar la solicitud (${response.status}).`;

    throw new ErrorDeApi(response.status, mensaje);
  }

  return datos as T;
};
