import {
  CAMPOS_OBLIGATORIOS,
  type Antecedentes,
  type DatosDetencion,
  type DatosDetenido,
  type DatosFiscal,
  type DatosPruebas,
  type FuncionarioParte,
  type Testigo,
  type VehiculoInvolucrado,
} from "./types";

/**
 * Utilidades de dominio — Guardia Virtual
 * ───────────────────────────────────────
 * Funciones puras que operan sobre los antecedentes: detección de campos
 * faltantes y generación de mensajes conversacionales para el funcionario.
 */

/** Datos del detenido con todos los campos vacíos. */
export const DETENIDO_VACIO: DatosDetenido = {
  nombre: null,
  rut: null,
  edad: null,
  nacionalidad: null,
  estadoCivil: null,
  estudios: null,
  ocupacion: null,
  fechaNacimiento: null,
  domicilio: null,
  telefono: null,
  correo: null,
};

/** Circunstancias de la detención con todos los campos vacíos. */
export const DETENCION_VACIA: DatosDetencion = {
  hora: null,
  fechaDetencion: null,
  delito: null,
  lugarDetencion: null,
  personalAprehensor: null,
  personalAcompanante: null,
  vehiculo: null,
  lesiones: null,
  situacion: null,
};

/** Fiscal de turno sin datos. */
export const FISCAL_VACIO: DatosFiscal = {
  nombre: null,
  folio: null,
  instrucciones: [],
};

/** Pruebas sin resultado. */
export const PRUEBAS_VACIAS: DatosPruebas = {
  alcoholemia: null,
  respiratoria: null,
  otras: [],
};

/** Crea unos antecedentes sin datos (caso nuevo). */
export const crearAntecedentesVacios = (): Antecedentes => ({
  tipoProcedimiento: null,
  especie: null,
  lugar: null,
  fecha: null,
  descripcionHechos: null,
  detenido: { ...DETENIDO_VACIO },
  detencion: { ...DETENCION_VACIA },
  funcionarios: [],
  fiscal: { ...FISCAL_VACIO, instrucciones: [] },
  pruebas: { ...PRUEBAS_VACIAS, otras: [] },
  vehiculos: [],
  testigos: [],
  camaras: null,
  diligencias: [],
  detalleEspecies: null,
  contradicciones: [],
});

/**
 * Indica si el procedimiento corresponde a un parte de detenido.
 *
 * Se considera detención cuando hay algún dato del detenido o cuando el
 * tipo de procedimiento lo señala explícitamente.
 */
export const esDetencion = (
  datos: Pick<Antecedentes, "tipoProcedimiento" | "detenido">
): boolean => {
  const hayDatosDelDetenido = Object.values(datos.detenido ?? {}).some(
    (valor) => Boolean(valor)
  );

  return (
    hayDatosDelDetenido || /deten|aprehen/i.test(datos.tipoProcedimiento ?? "")
  );
};

/**
 * Combina dos objetos de datos planos conservando los valores ya conocidos
 * cuando el nuevo objeto trae `null`. Se usa para acumular los datos del
 * detenido y de la detención entre mensajes del chat.
 */
export const combinarDatos = <T extends Record<string, string | null>>(
  nuevo: T,
  previo: T
): T => {
  const resultado = { ...previo };

  for (const clave of Object.keys(nuevo) as Array<keyof T>) {
    if (nuevo[clave]) {
      resultado[clave] = nuevo[clave];
    }
  }

  return resultado;
};

/**
 * Combina el fiscal de turno entre mensajes: conserva los datos ya conocidos
 * y reemplaza las instrucciones solo cuando el mensaje trae nuevas.
 */
export const combinarFiscal = (
  nuevo: DatosFiscal,
  previo: DatosFiscal
): DatosFiscal => ({
  nombre: nuevo.nombre ?? previo.nombre,
  folio: nuevo.folio ?? previo.folio,
  instrucciones:
    nuevo.instrucciones.length > 0
      ? nuevo.instrucciones
      : previo.instrucciones,
});

/**
 * Combina el personal a cargo evitando duplicados por nombre.
 * Se usa para el bloque de firmas del parte.
 */
export const combinarFuncionarios = (
  nuevos: FuncionarioParte[],
  previos: FuncionarioParte[]
): FuncionarioParte[] => {
  const porNombre = new Map<string, FuncionarioParte>();

  for (const funcionario of [...previos, ...nuevos]) {
    const nombre = funcionario.nombre?.trim();
    if (!nombre) continue;

    const clave = nombre.toLowerCase();
    const anterior = porNombre.get(clave);
    porNombre.set(clave, {
      grado: funcionario.grado ?? anterior?.grado ?? null,
      nombre,
    });
  }

  return [...porNombre.values()];
};

/** Indica si el procedimiento tiene especies que describir.
 *
 * En una detención por conducción en estado de ebriedad, una VIF o un
 * accidente no hay «especie», así que no debe exigirse ese dato.
 */
export const exigeEspecie = (
  antecedentes: Pick<Antecedentes, "tipoProcedimiento">
): boolean =>
  /hurt|rob|recept|apropiaci|da[ñn]o|estafa|usurpaci|especie/i.test(
    antecedentes.tipoProcedimiento ?? ""
  );

/**
 * Combina listas de textos sin duplicados (comparación sin distinguir
 * mayúsculas ni espacios sobrantes).
 */
export const combinarListas = (
  nuevas: readonly string[],
  previas: readonly string[]
): string[] => {
  const vistas = new Set(
    previas.map((valor) => valor.trim().toLowerCase()).filter(Boolean)
  );
  const resultado = previas.filter((valor) => valor.trim());

  for (const valor of nuevas) {
    const limpio = valor.trim();
    if (!limpio) continue;

    const clave = limpio.toLowerCase();
    if (vistas.has(clave)) continue;

    vistas.add(clave);
    resultado.push(limpio);
  }

  return resultado;
};

/** Clave de identificación de un vehículo (patente o marca/modelo/color). */
const claveVehiculo = (vehiculo: VehiculoInvolucrado): string =>
  (
    vehiculo.patente?.trim() ||
    [vehiculo.marca, vehiculo.modelo, vehiculo.color]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();

/**
 * Combina vehículos entre mensajes, conservando los datos ya conocidos.
 * Dos vehículos son el mismo cuando coinciden la patente o, a falta de ella,
 * marca, modelo y color.
 */
export const combinarVehiculos = (
  nuevos: readonly VehiculoInvolucrado[],
  previos: readonly VehiculoInvolucrado[]
): VehiculoInvolucrado[] => {
  const porClave = new Map<string, VehiculoInvolucrado>();

  for (const vehiculo of [...previos, ...nuevos]) {
    const clave = claveVehiculo(vehiculo);
    if (!clave) continue;

    const anterior = porClave.get(clave);
    const combinado: VehiculoInvolucrado = {
      patente: vehiculo.patente ?? anterior?.patente ?? null,
      marca: vehiculo.marca ?? anterior?.marca ?? null,
      modelo: vehiculo.modelo ?? anterior?.modelo ?? null,
      color: vehiculo.color ?? anterior?.color ?? null,
      anio: vehiculo.anio ?? anterior?.anio ?? null,
      documentos: vehiculo.documentos ?? anterior?.documentos ?? null,
      seguros: vehiculo.seguros ?? anterior?.seguros ?? null,
      licencias: vehiculo.licencias ?? anterior?.licencias ?? null,
    };

    porClave.set(clave, combinado);
  }

  return [...porClave.values()];
};

/** Combina testigos sin duplicar por nombre o RUT. */
export const combinarTestigos = (
  nuevos: readonly Testigo[],
  previos: readonly Testigo[]
): Testigo[] => {
  const porClave = new Map<string, Testigo>();

  for (const testigo of [...previos, ...nuevos]) {
    const clave =
      testigo.rut?.trim().toLowerCase() ||
      testigo.nombre?.trim().toLowerCase() ||
      "";
    if (!clave) continue;

    const anterior = porClave.get(clave);
    porClave.set(clave, {
      nombre: testigo.nombre ?? anterior?.nombre ?? null,
      rut: testigo.rut ?? anterior?.rut ?? null,
      declaracion: testigo.declaracion ?? anterior?.declaracion ?? null,
    });
  }

  return [...porClave.values()];
};

/**
 * Acumula los antecedentes extraídos sobre el estado previo.
 *
 * `reiniciar` se usa cuando el texto describe otro procedimiento: en ese caso
 * el estado se reemplaza completo para que el caso nuevo no herede datos.
 * Es la función que comparten el chat y la ingesta de documentos.
 */
export const combinarAntecedentes = (
  previos: Antecedentes,
  nuevos: Antecedentes,
  reiniciar = false
): Antecedentes => {
  if (reiniciar) {
    return {
      ...crearAntecedentesVacios(),
      ...nuevos,
      pruebas: { ...nuevos.pruebas, otras: [...nuevos.pruebas.otras] },
    };
  }

  return {
    tipoProcedimiento: nuevos.tipoProcedimiento ?? previos.tipoProcedimiento,
    especie: nuevos.especie ?? previos.especie,
    lugar: nuevos.lugar ?? previos.lugar,
    fecha: nuevos.fecha ?? previos.fecha,
    descripcionHechos: nuevos.descripcionHechos ?? previos.descripcionHechos,
    detenido: combinarDatos(nuevos.detenido, previos.detenido),
    detencion: combinarDatos(nuevos.detencion, previos.detencion),
    funcionarios: combinarFuncionarios(
      nuevos.funcionarios,
      previos.funcionarios
    ),
    fiscal: combinarFiscal(nuevos.fiscal, previos.fiscal),
    pruebas: {
      alcoholemia: nuevos.pruebas.alcoholemia ?? previos.pruebas.alcoholemia,
      respiratoria:
        nuevos.pruebas.respiratoria ?? previos.pruebas.respiratoria,
      otras: combinarListas(nuevos.pruebas.otras, previos.pruebas.otras),
    },
    vehiculos: combinarVehiculos(nuevos.vehiculos, previos.vehiculos),
    testigos: combinarTestigos(nuevos.testigos, previos.testigos),
    camaras: nuevos.camaras ?? previos.camaras,
    diligencias: combinarListas(nuevos.diligencias, previos.diligencias),
    detalleEspecies: nuevos.detalleEspecies ?? previos.detalleEspecies,
    contradicciones: nuevos.contradicciones,
  };
};

/** Devuelve las etiquetas de los campos obligatorios que aún faltan. */
export const camposFaltantes = (antecedentes: Antecedentes): string[] =>
  CAMPOS_OBLIGATORIOS.filter(({ key }) => {
    // La especie solo se exige cuando el procedimiento la involucra.
    if (key === "especie" && !exigeEspecie(antecedentes)) return false;

    return !antecedentes[key];
  }).map(({ label }) => label);

/**
 * Indica si se puede redactar el borrador del parte.
 *
 * Hace falta que estén todos los campos obligatorios **y** que no haya
 * contradicciones: mezclar dos procedimientos distintos (por ejemplo, una
 * denuncia de violencia intrafamiliar y un robo) invalidaría el parte.
 */
export const puedeRedactarBorrador = (antecedentes: Antecedentes): boolean =>
  camposFaltantes(antecedentes).length === 0 &&
  antecedentes.contradicciones.length === 0;

/** Formatea una lista en español: "a", "a y b", "a, b y c". */
export const formatoLista = (items: string[]): string => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
};

/** Genera el mensaje conversacional según los campos que falten. */
export const crearRespuestaConversacional = (faltantes: string[]): string => {
  if (faltantes.length === 0) {
    return "Con los antecedentes disponibles puedo continuar con la confección del borrador.";
  }

  return `Para continuar necesito que indiques ${formatoLista(faltantes)}.`;
};
