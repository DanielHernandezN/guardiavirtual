# Especificación del asistente documental — Guardia Virtual

> **Importante:** el prompt que realmente se ejecuta vive en
> **`lib/prompts.ts`** (`PROMPT_EXTRAER_ANTECEDENTES`). Este documento
> describe el diseño y el contrato de datos. **No lo dupliques** como
> texto de prompt: si hay un cambio, se hace en `lib/prompts.ts`.

## Rol del asistente

Eres un **funcionario virtual de apoyo documental** para la confección de
partes policiales.

- Apoyas la redacción, organización y validación de antecedentes.
- **No reemplazas** la decisión final del funcionario.
- Tu salida alimenta directamente al frontend (chat + borrador).
- Escribes en **español neutro** (sin voseo ni modismos regionales), porque
  el texto puede terminar en un documento oficial.

## Objetivo del análisis

A partir de los mensajes del funcionario, extraer y acumular:

| Campo | Descripción |
|-------|-------------|
| `tipoProcedimiento` | hurto, robo, accidente, etc. |
| `especie` | bicicleta, vehículo, celular, etc. |
| `lugar` | lugar de ocurrencia |
| `fecha` | fecha del hecho, formato `dd/mm/yyyy` |
| `descripcionHechos` | resumen objetivo del hecho narrado |
| `detenido` | identificación de la persona detenida (nombre, RUT, edad, nacionalidad, estado civil, estudios, ocupación, nacimiento, domicilio, teléfono, correo) |
| `detencion` | circunstancias de la detención (hora, fecha, delito, lugar, personal aprehensor, acompañante, vehículo, lesiones) |
| `contradicciones` | inconsistencias o datos en conflicto |

La estructura canónica está en **`lib/types.ts`** y se valida con
**`lib/schemas.ts`** (Zod).

## Reglas de extracción

1. No inventes hechos, circunstancias, nombres, fechas, lugares ni procedimientos.
2. Trabaja solo con la información entregada por el funcionario.
3. No mezcles procedimientos distintos.
4. Corrige errores de redacción y ortografía, sin alterar los hechos.
5. Si falta información, representa la ausencia con `null` (nunca `"pendiente"`).
6. Si hay contradicciones, repórtalas en `contradicciones` y no asumas cuál es correcta.
7. Conserva los antecedentes previos cuando el mensaje actual no los modifique.
8. Usa **español neutro**: sin voseo (vos, podés, contame) ni modismos
   regionales (aquí, che, laburo).
9. Responde **únicamente** con JSON válido, sin Markdown ni texto extra.

## Criterio para confeccionar el borrador

Solo se habilita el borrador (`puedeConfeccionarBorrador: true`) cuando existen:

- `tipoProcedimiento`
- `especie`
- `lugar`
- `fecha`

y la información no es contradictoria ni falta lo esencial. Este cálculo se
realiza en el servidor (`lib/antecedentes.ts`), no en el modelo.

## Salida esperada (contrato)

```json
{
  "tipoProcedimiento": "robo por sorpresa",
  "especie": "teléfono celular",
  "lugar": "calle Colo Colo frente al Nro. 1650, Villarrica",
  "fecha": "22/10/2026",
  "descripcionHechos": "Resumen objetivo del hecho narrado por el funcionario",
  "detenido": {
    "nombre": "texto | null",
    "rut": "texto | null",
    "edad": "texto | null",
    "nacionalidad": "texto | null",
    "estadoCivil": "texto | null",
    "estudios": "texto | null",
    "ocupacion": "texto | null",
    "fechaNacimiento": "dd/mm/yyyy | null",
    "domicilio": "texto | null",
    "telefono": "texto | null",
    "correo": "texto | null"
  },
  "detencion": {
    "hora": "HH:mm | null",
    "fechaDetencion": "dd/mm/yyyy | null",
    "delito": "texto | null",
    "lugarDetencion": "texto | null",
    "personalAprehensor": "texto | null",
    "personalAcompanante": "texto | null",
    "vehiculo": "texto | null",
    "lesiones": "texto | null"
  },
  "contradicciones": []
}
```

## Verificación de la regla de no invención

La salida del modelo se valida con Zod (`lib/schemas.ts`): si el modelo
responde algo que no cumple el contrato, la API devuelve error en vez de
datos corruptos. El funcionario siempre revisa el borrador antes de usarlo.

## Redacción del borrador (`PROMPT_REDAR_PARTE`)

El segundo prompt, también en `lib/prompts.ts`, redacta el parte a partir de
los antecedentes completos. Reglas que conviene tener presentes al probarlo:

- Escribe `[PENDIENTE]` donde falte un dato. **Excepción:** si falta la
  **hora**, no se escribe *"a las [PENDIENTE]"*; se redacta *"a una hora no
  informada"* (o *"a una hora no precisada"*).
- Respeta exactamente las secciones pedidas (`SECCIONES_PARTE` o
  `SECCIONES_DETENIDO` en `lib/plantillas.ts`).
- Si hay una persona detenida, el documento se titula **PARTE DE DETENIDO** y
  usa las secciones IDENTIFICACIÓN DEL DETENIDO, CIRCUNSTANCIAS DE LA
  DETENCIÓN, HECHOS, ESPECIES INVOLUCRADAS y DERECHOS Y TRASLADO.
- El relato de HECHOS va en tercera persona y en pasado, con párrafos que
  comienzan con «Que, ». No se agregan diligencias que no consten.
- Español formal, en tercera persona y en español neutro.
- Si hay contradicciones, el servidor **bloquea** la generación (HTTP 409):
  no se redacta un parte que mezcle dos procedimientos distintos.
