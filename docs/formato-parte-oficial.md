# Formato oficial de los documentos — 9na. Comisaría Pucón

> **Documento de referencia.** Describe la **estructura** de los cuatro
> documentos modelo aportados por la unidad el 28/10/2026. No contiene nombres,
> RUT, teléfonos, correos ni ningún dato personal: los originales viven en
> `formato parte/`, que está en `.gitignore` y **nunca** se versiona.
>
> Sirve para ajustar `lib/plantillas.ts`, `lib/types.ts` y `lib/prompts.ts`
> según el formato real de la unidad.

## 1. Documentos analizados

La unidad distingue dos cosas: las **actas de aprehensor** son la información
que el personal de servicio en la población entrega al funcionario de guardia;
los **partes** son el documento final que se confecciona en el servicio de
guardia. La aplicación recibe el contenido del acta (por el chat) y genera el
parte.

| # | Archivo (tipo) | Documento | Rol | Extensión |
|---|----------------|-----------|-----|-----------|
| A | `DETENIDO VIF.docx` | Denuncia / parte por violencia intrafamiliar | **Salida** | 1 página, secciones |
| B | `detenido conduccion ebriedad.docx` | Parte de detenido por accidente y conducción en estado de ebriedad | **Salida** | 1 página, secciones |
| C | `ACTA APREHENSORTES DETENIDO HURTO SUPERMERCADO.docx` | Declaración voluntaria de aprehensor (1 funcionario) | **Entrada** | membrete + acta |
| D | `DETENIDO ACC TTO, ATROPELLO, ACTA APREHENSOR.docx` | Parte de detenido por atropello + 2 declaraciones de aprehensor | Mixto (parte = salida; actas = entrada) | 2 copias del acta |

## 2. Estructura común

### 2.1 Membrete (solo en el acta de aprehensor)

```
CARABINEROS DE CHILE
PREFECTURA VILLARRICA NRO. 3
        9NA. COMISARÍA PUCÓN
```

### 2.2 Título del documento

- Parte / denuncia: **no** lleva título interno; el documento empieza con la
  fórmula de apertura.
- Acta de aprehensor: `DECLARACIÓN VOLUNTARIA DE APREHENSORES.`
  (en algunos casos con un número de folio entre paréntesis).

### 2.3 Fórmulas de apertura

| Documento | Apertura |
|-----------|----------|
| Parte de detenido | `Doy cuenta a esa Fiscalía Local de [comuna], que el día de hoy [día] [fecha], siendo las HH:MM horas, personal de servicio …` |
| Denuncia (VIF) | `Se da cuenta a esa Fiscalía Local que, hoy siendo las HH:MM horas se presentó en el servicio de guardia de esta unidad la ciudadana identificada como [NOMBRE], individualizada en el rubro denunciante/víctima, quien da cuenta del siguiente hecho:` |
| Acta de aprehensor | `Que el día de hoy, [día] [fecha], en circunstancias que me encontraba de servicio …` |

### 2.4 Cuerpo narrativo

- Párrafos en tercera persona y pasado.
- Uso abundante de `Que, …` y de conectores `Una vez en el lugar, siendo las
  HH:MM horas, …`.
- Los datos de identificación (nombre, edad, nacionalidad, estado civil,
  estudios, ocupación, fecha de nacimiento, cédula, domicilio, teléfono,
  correo) van **dentro del relato**, no en una sección aparte.

### 2.5 Secciones

Título en **MAYÚSCULAS seguido de dos puntos**, contenido en el párrafo
siguiente. Las secciones **varían según el procedimiento**:

| Sección | VIF | Ebriedad | Hurto | Atropello |
|---------|:---:|:--------:|:-----:|:---------:|
| DERECHOS | | ● | | |
| LESIONES | ● | ● | ● | ● |
| VERIFICACIÓN DE IDENTIDAD | | ● | | |
| ANTECEDENTES | | ● | | |
| ESPECIES SUSTRAÍDAS | | | ● | |
| ESPECIES / INCAUTACIÓN | | | ● | |
| GRABACIONES / CADENA DE CUSTODIA | | | ● | |
| DAÑOS | | ● | | ● |
| AVALÚO | | ● | | ● |
| TESTIGOS | ● | ● | | |
| CÁMARAS DE SEGURIDAD | ● | ● | | ● |
| LICENCIAS DE CONDUCTOR | | ● | | ● |
| SEGUROS OBLIGATORIOS / COMPLEMENTARIOS | | ● | | |
| CONSENTIMIENTO SERNAMEG | ● | | | |
| PAUTA RIESGO | ● | | | |
| IDENTIDAD DEL DENUNCIADO | ● | | | |
| CONTROL DE ARMAS | ● | | | |
| DILIGENCIAS | ● | | ● | |
| INSTRUCCIONES DEL FISCAL DE TURNO | ● | ● | ● | ● |
| SITUACIÓN DEL DETENIDO | | ● | | |

### 2.6 Instrucciones del fiscal

Siempre cierran el documento:

```
INSTRUCCIONES FISCAL DE TURNO: Se tomó contacto vía Bitácora Web con el
fiscal de turno [NOMBRE], mediante Folio N° [FOLIO], el cual instruyó lo
siguiente:
1. …
2. …
```

En la bitácora web cada instrucción puede llevar fecha y hora
(`dd-mm-yyyy HH:MM`).

### 2.7 Cierre y firmas

- **Parte de detenido:** termina con `SITUACIÓN DETENIDO` (control de
  detención, bloque AM/PM). No usa «Es cuanto puedo informar a Ud.».
- **Acta de aprehensor:**

```
DATOS DE LOS FUNCIONARIOS A CARGO DEL PROCEDIMIENTO.

Sargento 2do. [NOMBRE]          _________________

Cabo 1ro. [NOMBRE]              _________________
```

  Una firma por funcionario, con **grado + nombre**.

## 3. Acta de aprehensor (documento de entrada)

No se genera: es la información que el personal de servicio entrega al
funcionario de guardia. La aplicación la recibe por el chat y extrae de ella
el personal aprehensor, el vehículo, las especies, la incautación y las
instrucciones del fiscal. Se emite **una por cada funcionario aprehensor**.
Estructura:

1. Membrete (3 líneas).
2. `DECLARACIÓN VOLUNTARIA DE APREHENSORES.`
3. `DATOS GENERALES DE LA DILIGENCIA:` Fecha · Hora · Lugar.
4. `DATOS DEL APREHENSOR QUE DECLARA:` una línea corrida con nombre, edad,
   nacionalidad, estado civil, estudios, ocupación, fecha de nacimiento,
   cédula de identidad, domicilio laboral y teléfono.
5. Fórmula legal (texto fijo):

   > Conforme lo faculta la letra d) del Art. 83 del CPP, se procede previa la
   > lectura de los Arts. 302, 305 y 308 del Código Procesal Penal, relativos
   > a la facultad de no declarar por motivos personales; al principio de no
   > autoincriminación y protección de testigos, a tomar declaración al(la)
   > testigo ya individualizado(a), quien ha manifestado su deseo de hacerlo
   > libre y voluntariamente, y en razón de lo anterior, expresa lo siguiente:

6. Relato `Que el día de hoy, …` (redactado desde la posición del funcionario:
   «me encontraba de servicio…»).
7. Secciones del procedimiento (LESIONES, ESPECIES, INCAUTACIÓN, etc.).
8. Instrucciones del fiscal.
9. `DATOS DE LOS FUNCIONARIOS A CARGO DEL PROCEDIMIENTO` + firmas.

## 4. Brecha con la implementación anterior (Fase 8)

> Estado: **resuelto en la Fase 11** (ver sección 7). Se conserva la tabla
> como registro de lo que había que cambiar.

| Aspecto | Antes (`lib/plantillas.ts`) | Formato real |
|---------|---------------------------|--------------|
| Título | `PARTE DE DETENIDO` en el cuerpo | Sin título; apertura «Doy/Se da cuenta…» |
| Encabezado | UNIDAD / PARTE NRO. / FECHA / FUNCIONARIO / MATERIA | Membrete institucional (Carabineros, Prefectura, Comisaría) |
| Identificación del detenido | Sección «IDENTIFICACIÓN DEL DETENIDO» con líneas `Etiqueta: valor` | Integrada en el relato |
| Circunstancias | Sección «CIRCUNSTANCIAS DE LA DETENCIÓN» | Integradas en el relato |
| Secciones | 5 fijas | Variables según el procedimiento (13 detectadas) |
| Cierre | «Es cuanto puedo informar a Ud.» + firma | Instrucciones del fiscal / situación del detenido + firmas de todos los funcionarios |
| Firmas | Una (funcionario de sesión) | Una por funcionario a cargo, con grado |
| Acta de aprehensor | No existe | Documento aparte, uno por aprehensor |

## 5. Datos que faltan en el modelo

Campos nuevos necesarios en `lib/types.ts` (todos opcionales, `null` si no
constan):

- **Unidad:** prefectura, comisaría, dirección, teléfono.
- **Diligencia:** fiscal de turno, folio de bitácora web, instrucciones
  (lista ordenada, con hora opcional).
- **Lesiones:** DAU/FAU, carácter (leve / grave / sin lesiones), detalle por
  región (cabeza, cara, extremidades, etc.).
- **Especies:** detalle, avalúo total, cadena de custodia / N.U.E.
- **Vehículos:** marca, modelo, año, color, patente, daños, seguro, licencia.
- **VIF:** consentimiento SERNAMEG, pauta de riesgo, identidad del denunciado,
  control de armas.
- **Funcionarios:** lista de personal a cargo con grado y nombre (para las
  firmas y para generar el acta de cada aprehensor).

## 6. Decisiones pendientes con la unidad

1. Confirmar los datos exactos del membrete (prefectura y comisaría) y la
   comuna que va en la fórmula de apertura.
2. ¿El parte lleva **número de parte** o folio visible, además del folio de
   bitácora del fiscal?
3. ¿Se conserva la fórmula «Es cuanto puedo informar a Ud.» en algún tipo de
   documento? Los modelos aportados no la usan.
4. ¿El acta de aprehensor debe poder **cargarse como archivo** (`.docx`), o
   basta con pegarla en el chat?

## 7. Implementación (Fase 11)

| Elemento | Dónde | Cómo |
|----------|-------|------|
| Membrete | `construirMembrete()` | `UNIDAD_PREFECTURA` + `UNIDAD_NOMBRE` (opcionales) |
| Comuna de apertura | `UNIDAD_COMUNA` | Se pasa al prompt de redacción |
| Secciones | `SECCIONES_PARTE`, `SECCIONES_DETENIDO`, `SECCIONES_VIF` | El modelo devuelve solo las que tienen datos |
| Fórmula de apertura | Instrucción de la sección `RELATO` | «Doy cuenta…» / «Se da cuenta…» |
| Identificación | Dentro del `RELATO` | En línea corrida, sin listas |
| Instrucciones del fiscal | `construirInstruccionesFiscal()` | Se arman desde `fiscal.nombre`, `fiscal.folio` y `fiscal.instrucciones` |
| Situación del detenido | Sección `SITUACIÓN DEL DETENIDO` | Desde `detencion.situacion` |
| Firmas | `construirPieParte()` | Una línea por funcionario (`funcionarios`), o el funcionario en sesión si no se informó |
| Título | `BorradorParte.titulo` | Solo para el nombre del caso; **no se imprime** |

Campos nuevos en `lib/types.ts`: `FuncionarioParte`, `DatosFiscal`,
`Antecedentes.funcionarios`, `Antecedentes.fiscal` y `detencion.situacion`.
