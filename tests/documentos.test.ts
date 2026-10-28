import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import mammoth from "mammoth";

import { crearAntecedentesVacios } from "@/lib/antecedentes";
import {
  generarDocumentoWord,
  nombreArchivoWord,
} from "@/lib/documentos/docx";
import { procesarDocumento } from "@/lib/documentos/flujo";
import { extraerTextoDocumento } from "@/lib/documentos/ingesta";
import {
  antecedentesSinDestino,
  ordenarSecciones,
} from "@/lib/documentos/mapeo";
import {
  PLANTILLA_DETENIDO,
  PLANTILLAS,
} from "@/lib/documentos/plantillas";
import { construirTrazabilidad } from "@/lib/documentos/trazabilidad";
import {
  validarAntecedentes,
  validarPatente,
  validarRut,
} from "@/lib/documentos/validacion";
import { construirMensajeBorrador } from "@/lib/prompts";
import {
  TITULO_ENCABEZADO,
  TITULO_INSTRUCCIONES,
  TITULO_PIE,
  TITULO_RELATO,
  TITULO_SITUACION,
  seccionesPara,
} from "@/lib/plantillas";
import type { Antecedentes } from "@/lib/types";

/**
 * Pruebas del módulo documental. Cubren las comprobaciones determinísticas
 * (ingesta, validación, mapeo, trazabilidad y Word) y el flujo completo con
 * un extractor controlado: no se llama al proveedor de IA.
 */

const TEXTO_ACTA =
  "El día 12/06/2026, siendo las 23:30 horas, en Plaza de Armas de Pucón, " +
  "personal de servicio detuvo a Juan Pérez Muñoz, RUT 12.345.678-5, por " +
  "conducir en estado de ebriedad. Se practicó alcoholemia: 1,42 g/L. " +
  "El detenido no presenta lesiones.";

/** Antecedentes completos de un caso ficticio (sin datos reales). */
const antecedentesDePrueba = (): Antecedentes => {
  const antecedentes = crearAntecedentesVacios();

  return {
    ...antecedentes,
    tipoProcedimiento: "conducción en estado de ebriedad",
    lugar: "Plaza de Armas de Pucón",
    fecha: "12/06/2026",
    descripcionHechos:
      "Personal de servicio detuvo al conductor del vehículo por conducir en estado de ebriedad.",
    detenido: {
      ...antecedentes.detenido,
      nombre: "Juan Pérez Muñoz",
      rut: "12.345.678-5",
      edad: "34 años",
    },
    detencion: {
      ...antecedentes.detencion,
      hora: "23:30",
      fechaDetencion: "12/06/2026",
      delito: "conducción en estado de ebriedad",
      lugarDetencion: "Plaza de Armas de Pucón",
      personalAprehensor: "Sargento 2do. Carlos Soto",
      lesiones: "sin lesiones",
      situacion: "pasa a control de detención",
    },
    funcionarios: [
      { grado: "Sargento 2do.", nombre: "Carlos Soto" },
    ],
    fiscal: {
      nombre: "Fiscal de turno",
      folio: "1234",
      instrucciones: ["Dejar al detenido a disposición del tribunal."],
    },
    pruebas: {
      alcoholemia: "1,42 g/L",
      respiratoria: null,
      otras: [],
    },
    contradicciones: [],
  };
};

/**
 * Genera un PDF mínimo con una página y una línea de texto.
 * Sirve para comprobar la extracción de PDF con capa de texto sin depender
 * de archivos externos ni de datos reales.
 */
const crearPdfDeTexto = (texto: string): Uint8Array => {
  const contenido = `BT /F1 12 Tf 72 720 Td (${texto.replace(
    /[()\\]/g,
    "\\$&"
  )}) Tj ET`;

  const objetos = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${contenido.length} >> stream\n${contenido}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const objeto of objetos) {
    offsets.push(pdf.length);
    pdf += `${objeto}\n`;
  }

  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

  return new TextEncoder().encode(pdf);
};

const seccionesDePrueba = () => [
  {
    titulo: TITULO_ENCABEZADO,
    contenido: "CARABINEROS DE CHILE\nPREFECTURA VILLARRICA NRO. 3",
  },
  {
    titulo: TITULO_RELATO,
    contenido:
      "Doy cuenta a esa Fiscalía Local que, el día de hoy, personal de servicio detuvo a Juan Pérez Muñoz.",
  },
  { titulo: "LESIONES", contenido: "El detenido no presenta lesiones." },
  {
    titulo: TITULO_PIE,
    contenido:
      "DATOS DE LOS FUNCIONARIOS A CARGO DEL PROCEDIMIENTO.\n\nSargento 2do. Carlos Soto _________________________",
  },
];

describe("ingesta documental", () => {
  it("lee un archivo de texto y normaliza el contenido", async () => {
    const resultado = await extraerTextoDocumento({
      nombre: "acta.txt",
      bytes: new TextEncoder().encode(`\uFEFF${TEXTO_ACTA}\r\n`),
    });

    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;

    assert.equal(resultado.tipo, "txt");
    assert.equal(resultado.metodo, "texto");
    assert.match(resultado.texto, /Juan Pérez Muñoz/);
    assert.ok(!resultado.texto.includes("\r"));
  });

  it("extrae el texto de un DOCX", async () => {
    const archivo = await generarDocumentoWord({
      titulo: "Acta de prueba",
      secciones: seccionesDePrueba(),
    });

    const resultado = await extraerTextoDocumento({
      nombre: "acta.docx",
      bytes: new Uint8Array(archivo),
    });

    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;

    assert.equal(resultado.metodo, "docx");
    assert.match(resultado.texto, /Juan Pérez Muñoz/);
    assert.match(resultado.texto, /LESIONES/);
  });

  it("extrae el texto de un PDF con capa de texto", async () => {
    const resultado = await extraerTextoDocumento({
      nombre: "acta.pdf",
      bytes: crearPdfDeTexto(
        "ACTA DE PRUEBA. Detenido: Juan Perez. Fecha: 12/06/2026. Lugar: Pucon. Se deja constancia del procedimiento."
      ),
    });

    assert.equal(resultado.ok, true);
    if (!resultado.ok) return;

    assert.equal(resultado.metodo, "pdf");
    assert.equal(resultado.paginas, 1);
    assert.match(resultado.texto, /Juan Perez/);
  });

  it("no declara procesado un DOCX sin texto (requiere OCR)", async () => {
    const vacio = await Packer.toBuffer(
      new Document({
        sections: [{ children: [new Paragraph({ children: [new TextRun("")] })] }],
      })
    );

    const resultado = await extraerTextoDocumento({
      nombre: "escaneado.docx",
      bytes: new Uint8Array(vacio),
    });

    assert.equal(resultado.ok, false);
    if (resultado.ok) return;

    assert.equal(resultado.motivo, "ocr");
    assert.match(resultado.error, /OCR/);
  });

  it("rechaza un formato no admitido y una firma que no corresponde", async () => {
    const formato = await extraerTextoDocumento({
      nombre: "acta.exe",
      bytes: new Uint8Array([1, 2, 3]),
    });

    assert.equal(formato.ok, false);
    if (!formato.ok) assert.equal(formato.motivo, "tipo");

    const firma = await extraerTextoDocumento({
      nombre: "acta.pdf",
      bytes: new TextEncoder().encode(TEXTO_ACTA),
    });

    assert.equal(firma.ok, false);
    if (!firma.ok) assert.equal(firma.motivo, "tipo");
  });
});

describe("validación de antecedentes", () => {
  it("valida el dígito verificador del RUT", () => {
    assert.equal(validarRut("12.345.678-5"), true);
    assert.equal(validarRut("12.345.678-9"), false);
    assert.equal(validarRut(null), false);
  });

  it("valida el formato de las patentes chilenas", () => {
    assert.equal(validarPatente("ABCD12"), true);
    assert.equal(validarPatente("AB1234"), true);
    assert.equal(validarPatente("ABC123"), false);
  });

  it("no inventa el resultado de alcoholemia cuando no consta", () => {
    const antecedentes = antecedentesDePrueba();
    antecedentes.pruebas = { alcoholemia: null, respiratoria: null, otras: [] };

    const observaciones = validarAntecedentes(antecedentes);

    assert.equal(antecedentes.pruebas.alcoholemia, null);

    const aviso = observaciones.find(
      (observacion) => observacion.campo === "pruebas.alcoholemia"
    );

    assert.ok(aviso);
    assert.match(aviso.mensaje, /no consta/i);
    assert.match(aviso.mensaje, /No se deduce/);
  });

  it("detecta incoherencias de edad sin corregirlas", () => {
    const antecedentes = antecedentesDePrueba();
    antecedentes.detenido.edad = "60 años";
    antecedentes.detenido.fechaNacimiento = "01/01/1992";

    const observaciones = validarAntecedentes(antecedentes);

    assert.ok(
      observaciones.some(
        (observacion) =>
          observacion.campo === "detenido.edad" &&
          observacion.nivel === "advertencia"
      )
    );
    assert.equal(antecedentes.detenido.edad, "60 años");
    assert.equal(antecedentes.detenido.fechaNacimiento, "01/01/1992");
  });

  it("identifica contradicciones sin resolverlas", () => {
    const antecedentes = antecedentesDePrueba();
    antecedentes.contradicciones = [
      "El detenido aparece con dos RUT distintos.",
    ];

    const observaciones = validarAntecedentes(antecedentes);

    assert.ok(
      observaciones.some(
        (observacion) =>
          observacion.nivel === "error" &&
          observacion.campo === "contradicciones"
      )
    );
    assert.equal(antecedentes.contradicciones.length, 1);
  });

  it("no marca como sin destino los antecedentes que la plantilla usa", () => {
    const antecedentes = antecedentesDePrueba();
    antecedentes.pruebas.otras = ["Peritaje de alcoholemia en laboratorio."];
    antecedentes.vehiculos = [
      {
        patente: "ABCD12",
        marca: "Toyota",
        modelo: "Yaris",
        color: "blanco",
        anio: "2020",
        documentos: "permiso de circulación",
        seguros: "seguro obligatorio",
        licencias: "clase B",
      },
    ];
    antecedentes.testigos = [
      {
        nombre: "Ana Soto",
        rut: "9.876.543-2",
        declaracion: "Vio al conductor descender del vehículo.",
      },
    ];
    antecedentes.camaras = "Cámara municipal de Avenida O'Higgins.";
    antecedentes.diligencias = ["Prueba respiratoria", "Empadronamiento."];
    antecedentes.detalleEspecies = "Licencia de conducir clase B, incautada.";

    // Las contradicciones son control del análisis, no contenido del parte.
    antecedentes.contradicciones = ["El RUT aparece con dos dígitos distintos."];

    const sinDestino = antecedentesSinDestino(antecedentes, PLANTILLA_DETENIDO);

    assert.deepEqual(sinDestino, []);

    const trazabilidad = construirTrazabilidad(antecedentes, TEXTO_ACTA);
    assert.ok(
      !Object.keys(trazabilidad.campos).some((ruta) =>
        ruta.startsWith("contradicciones")
      )
    );
  });
});

describe("mapeo a la plantilla", () => {
  it("impone el orden de las secciones definido por la plantilla", () => {
    const secciones = ordenarSecciones(
      [
        { titulo: "DILIGENCIAS", contenido: "Se practicó la prueba." },
        { titulo: TITULO_RELATO, contenido: "Relato." },
        { titulo: "LESIONES", contenido: "Sin lesiones." },
        { titulo: "SECCIÓN INVENTADA", contenido: "Texto adicional." },
        // Las arma el servidor con datos estructurados: no deben duplicarse.
        { titulo: TITULO_SITUACION, contenido: "Duplicada." },
        { titulo: TITULO_INSTRUCCIONES, contenido: "Duplicada." },
        { titulo: "LESIONES", contenido: "Duplicada." },
      ],
      PLANTILLA_DETENIDO
    );

    assert.deepEqual(
      secciones.map((seccion) => seccion.titulo),
      [TITULO_RELATO, "LESIONES", "DILIGENCIAS", "SECCIÓN INVENTADA"]
    );
  });

  it("no incorpora datos de un caso de ejemplo al redactar otro", () => {
    const mensaje = construirMensajeBorrador(
      antecedentesDePrueba(),
      seccionesPara(true, "conducción en estado de ebriedad"),
      true,
      "12/06/2026",
      "Pucón",
      {
        plantilla: PLANTILLA_DETENIDO,
        reglas: PLANTILLA_DETENIDO.reglasRedaccion,
      }
    );

    assert.match(mensaje, /Juan Pérez Muñoz/);
    assert.doesNotMatch(mensaje, /98\.765\.432-1/);
    assert.doesNotMatch(mensaje, /María Ejemplo/);

    // Las definiciones de plantilla no contienen datos de casos de ejemplo.
    const plantillas = JSON.stringify(PLANTILLAS);
    assert.doesNotMatch(plantillas, /[A-Z]{4}\d{2}/);
    assert.doesNotMatch(plantillas, /\d{2}\.\d{3}\.\d{3}-\d/);
  });

  it("marca los datos no localizados literalmente como dudosos", () => {
    const antecedentes = antecedentesDePrueba();
    antecedentes.detencion.personalAcompanante =
      "Cabo Primero Nombre Inventado";

    const trazabilidad = construirTrazabilidad(antecedentes, TEXTO_ACTA);

    assert.equal(
      trazabilidad.campos["detenido.rut"]?.estado,
      "extraido"
    );
    assert.match(
      trazabilidad.campos["detenido.rut"]?.fuente ?? "",
      /12\.345\.678-5/
    );
    assert.equal(
      trazabilidad.campos["detencion.personalAcompanante"]?.estado,
      "dudoso"
    );
    assert.equal(
      trazabilidad.campos["detencion.personalAcompanante"]?.confianza,
      null
    );
  });
});

describe("generación de Word", () => {
  it("genera un DOCX que conserva el texto y el formato institucional", async () => {
    const archivo = await generarDocumentoWord({
      titulo: "PARTE DE DETENIDO",
      secciones: seccionesDePrueba(),
    });

    assert.equal(archivo.subarray(0, 2).toString(), "PK");

    const texto = await mammoth.extractRawText({
      buffer: Buffer.from(archivo),
    });

    assert.match(texto.value, /CARABINEROS DE CHILE/);
    assert.match(texto.value, /Juan Pérez Muñoz/);
    assert.match(texto.value, /LESIONES/);
    assert.match(texto.value, /Carlos Soto/);

    const zip = await JSZip.loadAsync(archivo);
    const estilos = await zip.file("word/styles.xml")?.async("string");
    const documento = await zip.file("word/document.xml")?.async("string");

    assert.ok(estilos?.includes("Arial"));
    assert.ok(documento?.includes('w:pgMar'));
    assert.ok(documento?.includes("both"));
    // No quedan marcadores de plantilla sin reemplazar.
    assert.ok(!documento?.includes("{{"));
  });

  it("conserva las correcciones humanas en el archivo final", async () => {
    const secciones = seccionesDePrueba().map((seccion) =>
      seccion.titulo === TITULO_RELATO
        ? {
            ...seccion,
            contenido:
              "Doy cuenta a esa Fiscalía Local que el relato fue corregido por el funcionario.",
          }
        : seccion
    );

    const archivo = await generarDocumentoWord({
      titulo: "PARTE DE DETENIDO",
      secciones,
    });

    const texto = await mammoth.extractRawText({
      buffer: Buffer.from(archivo),
    });

    assert.match(texto.value, /corregido por el funcionario/);
    assert.doesNotMatch(texto.value, /personal de servicio detuvo/);
  });

  it("destaca los datos pendientes sin eliminarlos", async () => {
    const archivo = await generarDocumentoWord({
      titulo: "BORRADOR",
      secciones: [
        {
          titulo: TITULO_RELATO,
          contenido: "El hecho ocurrió el [PENDIENTE], en el sector.",
        },
      ],
    });

    const texto = await mammoth.extractRawText({
      buffer: Buffer.from(archivo),
    });

    assert.match(texto.value, /\[PENDIENTE\]/);
  });

  it("propone un nombre de archivo seguro", () => {
    assert.equal(
      nombreArchivoWord("PARTE DE DETENIDO / Hurto"),
      `parte-de-detenido-hurto-${new Date().toISOString().slice(0, 10)}.docx`
    );
  });
});

describe("flujo documental completo", () => {
  it("extrae, valida y deja el documento listo para redactar", async () => {
    const anterior = process.env.AI_API_KEY;
    process.env.AI_API_KEY = "clave-de-prueba";

    try {
      const resultado = await procesarDocumento({
        nombre: "acta.txt",
        bytes: new TextEncoder().encode(TEXTO_ACTA),
        ahora: new Date("2026-06-12T23:40:00.000Z"),
        extraer: async () => ({
          antecedentes: antecedentesDePrueba(),
          trozos: 1,
          cambioDeProcedimiento: false,
        }),
      });

      assert.equal(resultado.ok, true);
      if (!resultado.ok) return;

      const { documento } = resultado;

      assert.equal(documento.plantilla.id, "parte-detenido");
      assert.equal(documento.puedeRedactar, true);
      assert.equal(documento.faltantes.length, 0);
      assert.equal(documento.antecedentes.pruebas.alcoholemia, "1,42 g/L");
      assert.equal(documento.origen.tipo, "txt");
      assert.equal(documento.origen.hash.length, 64);
      assert.match(
        documento.trazabilidad.campos["lugar"]?.fuente ?? "",
        /Plaza de Armas/
      );
    } finally {
      if (anterior === undefined) {
        delete process.env.AI_API_KEY;
      } else {
        process.env.AI_API_KEY = anterior;
      }
    }
  });

  it("informa el error de ingesta sin perder el trabajo previo", async () => {
    const resultado = await procesarDocumento({
      nombre: "acta.docx",
      bytes: new Uint8Array([1, 2, 3, 4]),
    });

    assert.equal(resultado.ok, false);
    if (resultado.ok) return;

    assert.equal(resultado.motivo, "ingesta");
    assert.match(resultado.error, /no corresponde al formato/i);
  });

  it("bloquea la generación cuando hay contradicciones", async () => {
    const anterior = process.env.AI_API_KEY;
    process.env.AI_API_KEY = "clave-de-prueba";

    try {
      const conContradiccion = {
        ...antecedentesDePrueba(),
        contradicciones: ["El RUT aparece dos veces con dígitos distintos."],
      };

      const resultado = await procesarDocumento({
        nombre: "acta.txt",
        bytes: new TextEncoder().encode(TEXTO_ACTA),
        extraer: async () => ({
          antecedentes: conContradiccion,
          trozos: 1,
          cambioDeProcedimiento: false,
        }),
      });

      assert.equal(resultado.ok, true);
      if (!resultado.ok) return;

      assert.equal(resultado.documento.puedeRedactar, false);
      assert.ok(resultado.documento.bloqueos.length > 0);
    } finally {
      if (anterior === undefined) {
        delete process.env.AI_API_KEY;
      } else {
        process.env.AI_API_KEY = anterior;
      }
    }
  });
});
