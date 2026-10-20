/**
 * Normalización de fechas — Guardia Virtual
 * ──────────────────────────────────────────
 * Convierte distintos formatos de fecha a `dd/mm/yyyy`.
 * Si la fecha no se puede interpretar de forma inequívoca, devuelve `null`
 * (regla de no invención: nunca se adivina una fecha).
 */

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const esFechaValida = (dia: number, mes: number, anio: number): boolean => {
  if (mes < 1 || mes > 12) return false;
  if (dia < 1 || dia > 31) return false;

  // Día 0 del mes siguiente = último día del mes.
  const ultimoDia = new Date(anio, mes, 0).getDate();
  return dia <= ultimoDia;
};

const formatear = (dia: number, mes: number, anio: number): string =>
  `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;

/**
 * Normaliza una fecha a `dd/mm/yyyy`.
 *
 * Acepta:
 * - `dd/mm/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`
 * - `yyyy-mm-dd` (ISO)
 * - `dd de junio de 2026` / `dd de junio del 2026`
 *
 * Devuelve `null` si la fecha es inválida o no se puede interpretar.
 */
export const normalizarFecha = (valor: string | null): string | null => {
  if (!valor) return null;

  const texto = valor.trim().toLowerCase();
  if (!texto) return null;

  // dd/mm/yyyy (separadores / - .)
  const separada = texto.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (separada) {
    const dia = Number(separada[1]);
    const mes = Number(separada[2]);
    const anio = Number(separada[3]);
    return esFechaValida(dia, mes, anio) ? formatear(dia, mes, anio) : null;
  }

  // yyyy-mm-dd (ISO)
  const iso = texto.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (iso) {
    const anio = Number(iso[1]);
    const mes = Number(iso[2]);
    const dia = Number(iso[3]);
    return esFechaValida(dia, mes, anio) ? formatear(dia, mes, anio) : null;
  }

  // "12 de junio de 2026" o "12 de junio del 2026"
  const textual = texto.match(
    /^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+(?:de|del)\s+(\d{4})$/
  );
  if (textual) {
    const dia = Number(textual[1]);
    const mes = MESES[textual[2]];
    const anio = Number(textual[3]);

    if (mes && esFechaValida(dia, mes, anio)) {
      return formatear(dia, mes, anio);
    }

    return null;
  }

  return null;
};
