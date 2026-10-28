/**
 * Límites compartidos entre el servidor y la interfaz.
 * ────────────────────────────────────────────────────
 * Viven en un módulo sin dependencias para poder importarlos también desde
 * componentes de cliente sin arrastrar Zod al bundle.
 */

/** Longitud máxima del mensaje del funcionario (30 000 caracteres). */
export const MENSAJE_MAXIMO = 30_000;

/** Tamaño máximo del cuerpo JSON de una petición (256 KB). */
export const TAMANO_MAXIMO_CUERPO = 256 * 1024;
