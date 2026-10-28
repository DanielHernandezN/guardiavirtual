/**
 * Troceado de mensajes largos — Guardia Virtual
 * ─────────────────────────────────────────────
 * Un acta de aprehensor completa puede superar los 6 000 caracteres. Enviarla
 * entera al modelo hace que los modelos gratuitos tarden demasiado (o agoten
 * el tiempo de espera), así que el mensaje se divide en trozos que se procesan
 * en orden, acumulando los antecedentes igual que si el funcionario los
 * hubiera escrito en varios mensajes.
 *
 * El corte respeta los párrafos y, si un párrafo es demasiado largo, las
 * oraciones. Nunca parte una palabra.
 */

/** Longitud máxima de cada trozo enviado al modelo. */
export const TROZO_MAXIMO = 3_500;

/** Parte un párrafo que no cabe en un trozo, sin cortar palabras. */
const partirParrafo = (parrafo: string, maximo: number): string[] => {
  const trozos: string[] = [];
  let actual = "";

  for (const palabra of parrafo.split(/\s+/)) {
    if (!palabra) continue;

    if (!actual) {
      actual = palabra;
    } else if (actual.length + 1 + palabra.length <= maximo) {
      actual += ` ${palabra}`;
    } else {
      trozos.push(actual);
      actual = palabra;
    }
  }

  if (actual) trozos.push(actual);

  return trozos;
};

/**
 * Divide un texto en trozos de hasta `maximo` caracteres, respetando los
 * párrafos y las oraciones. Devuelve `[texto]` si ya cabe en un trozo.
 */
export const dividirEnTrozos = (
  texto: string,
  maximo: number = TROZO_MAXIMO
): string[] => {
  const limpio = texto.trim();

  if (!limpio) return [];
  if (limpio.length <= maximo) return [limpio];

  const trozos: string[] = [];
  let actual = "";

  const cerrar = () => {
    if (actual.trim()) trozos.push(actual.trim());
    actual = "";
  };

  const agregar = (bloque: string) => {
    if (bloque.length > maximo) {
      cerrar();

      // Oraciones del bloque; si una sola oración excede el máximo, se
      // reparte por palabras.
      const oraciones = bloque.match(/[^.!?]+[.!?]*\s*/g) ?? [bloque];

      for (const oracion of oraciones) {
        if (oracion.length > maximo) {
          cerrar();
          trozos.push(...partirParrafo(oracion, maximo));
        } else if (actual.length + oracion.length > maximo) {
          cerrar();
          actual = oracion.trim();
        } else {
          actual += oracion;
        }
      }

      return;
    }

    if (actual && actual.length + 1 + bloque.length > maximo) {
      cerrar();
    }

    actual = actual ? `${actual}\n${bloque}` : bloque;
  };

  for (const parrafo of limpio.split(/\n+/)) {
    if (parrafo.trim()) agregar(parrafo.trim());
  }

  cerrar();

  return trozos;
};
