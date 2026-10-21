/**
 * Limitación de uso — Guardia Virtual
 * ────────────────────────────────────
 * Protege el servicio frente al uso excesivo de los endpoints caros
 * (llamadas al modelo de IA).
 *
 * La implementación es **en memoria** (por proceso): suficiente para una
 * instancia única. En un despliegue con varias instancias (Vercel) hay que
 * mover el contador a un almacén compartido (Redis, Upstash, etc.).
 *
 * El límite se aplica por **funcionario** (id de sesión), no solo por IP:
 * así una Garde compartida no bloquea a todo el turno y un usuario no puede
 * esquivarlo cambiando de red.
 */

type Ventana = {
  /** Marcas de tiempo (ms) de las peticiones dentro de la ventana. */
  marcas: number[];
};

const ventanas = new Map<string, Ventana>();

/** Configuración por defecto de la ventana de uso. */
export const LIMITE_POR_DEFECTO = {
  /** Peticiones máximas dentro de la ventana. */
  maximo: 20,
  /** Tamaño de la ventana en milisegundos (1 minuto). */
  ventanaMs: 60_000,
};

export type ResultadoLimite = {
  /** `true` si la petición está permitida. */
  permitido: boolean;
  /** Peticiones restantes en la ventana actual. */
  restantes: number;
  /** Segundos que hay que esperar antes de reintentar (0 si está permitido). */
  reintentoEnSegundos: number;
};

/**
 * Registra una petición y devuelve si está permitida.
 *
 * Las marcas antiguas (fuera de la ventana) se descartan en cada llamada,
 * así que no hace falta un proceso de limpieza aparte.
 */
export const registrarUso = (
  clave: string,
  { maximo, ventanaMs }: { maximo?: number; ventanaMs?: number } = {}
): ResultadoLimite => {
  const limite = maximo ?? LIMITE_POR_DEFECTO.maximo;
  const ventana = ventanaMs ?? LIMITE_POR_DEFECTO.ventanaMs;
  const ahora = Date.now();

  const registro = ventanas.get(clave) ?? { marcas: [] };
  const marcas = registro.marcas.filter((marca) => ahora - marca < ventana);

  if (marcas.length >= limite) {
    const masAntigua = Math.min(...marcas);
    const reintentoEnSegundos = Math.max(
      1,
      Math.ceil((masAntigua + ventana - ahora) / 1000)
    );

    ventanas.set(clave, { marcas });
    return { permitido: false, restantes: 0, reintentoEnSegundos };
  }

  marcas.push(ahora);
  ventanas.set(clave, { marcas });

  return {
    permitido: true,
    restantes: limite - marcas.length,
    reintentoEnSegundos: 0,
  };
};

/** Borra el registro de una clave (por ejemplo, al cerrar sesión). */
export const limpiarUso = (clave: string): void => {
  ventanas.delete(clave);
};

/** Borra todos los registros. Solo para pruebas. */
export const limpiarUsoTotal = (): void => {
  ventanas.clear();
};
