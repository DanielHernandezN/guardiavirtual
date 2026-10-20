/**
 * Plantillas del parte policial — Guardia Virtual
 * ───────────────────────────────────────────────
 * Estructura formal del documento y títulos según el tipo de procedimiento.
 * El título se resuelve en el servidor (determinístico) para que el formato
 * sea consistente; el modelo solo redacta el contenido de cada sección.
 */

/** Secciones formales del parte, en orden. */
export const SECCIONES_PARTE = [
  "ANTECEDENTES",
  "HECHOS",
  "ESPECIES INVOLUCRADAS",
  "CONCLUSIÓN",
] as const;

/** Títulos del parte según el tipo de procedimiento. */
const TITULOS_POR_TIPO: Record<string, string> = {
  hurto: "PARTE DE HURTO",
  robo: "PARTE DE ROBO",
  "robo con violencia": "PARTE DE ROBO CON VIOLENCIA",
  "robo con intimidacion": "PARTE DE ROBO CON INTIMIDACIÓN",
  "robo de vehiculo": "PARTE DE ROBO DE VEHÍCULO",
  accidente: "PARTE DE ACCIDENTE DE TRÁNSITO",
  "accidente de transito": "PARTE DE ACCIDENTE DE TRÁNSITO",
  denuncia: "DENUNCIA",
  infraccion: "PARTE DE INFRACCIÓN",
  infracción: "PARTE DE INFRACCIÓN",
  violencia: "PARTE DE VIOLENCIA INTRAFAMILIAR",
  "violencia intrafamiliar": "PARTE DE VIOLENCIA INTRAFAMILIAR",
  amenazas: "PARTE DE AMENAZAS",
  otro: "PARTE POLICIAL",
};

/** Devuelve el título formal del parte según el tipo de procedimiento. */
export const tituloPorTipo = (tipoProcedimiento: string | null): string => {
  if (!tipoProcedimiento) {
    return "PARTE POLICIAL";
  }

  const clave = tipoProcedimiento.toLowerCase().trim();
  return TITULOS_POR_TIPO[clave] ?? "PARTE POLICIAL";
};
