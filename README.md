# Guardia Virtual

Asistente de apoyo documental para funcionarios de guardia: procesa el **acta
de aprehensión** (TXT, DOCX o PDF con texto), extrae los **antecedentes**,
redacta el **borrador del parte policial** con la plantilla de la unidad, exige
**revisión humana**, guarda el historial con **trazabilidad** y genera el
**Word institucional** listo para revisar y firmar.

> El sistema es un *asistente documental*: no reemplaza la decisión del
> funcionario ni la firma oficial. **Nunca inventa datos**: lo que falta se
> marca como `[PENDIENTE]`.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.3.3 (App Router) |
| UI | React 19 + Tailwind CSS v4 (paleta de verde olivo) |
| Lenguaje | TypeScript 5 (strict) |
| IA | API compatible con OpenAI (OpenRouter, OpenAI, Gemini, Groq, Mistral) |
| Datos | Prisma 6 + SQLite (desarrollo) / PostgreSQL (producción) |
| Documentos | `mammoth` (DOCX), `unpdf` (PDF), `docx` (Word de salida) |
| Sesión | Cookie firmada con HMAC-SHA256, contraseñas con `scrypt` |

---

## Puesta en marcha

```powershell
npm install
Copy-Item .env.example .env.local   # y completa los valores
npm run db:migrate                  # crea prisma/dev.db
npm run dev
```

La aplicación queda en <http://localhost:3000>.

### Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `AI_API_KEY` | **sí** | Clave del proveedor de IA. |
| `AI_BASE_URL` | no | Endpoint del proveedor (por defecto OpenRouter). |
| `AI_MODEL` | no | Modelo de extracción (por defecto `poolside/laguna-s-2.1:free`). |
| `AI_MODEL_REDACCION` | no | Modelo para redactar el borrador. Si falta, usa `AI_MODEL`. |
| `UNIDAD_NOMBRE` | no | Unidad que aparece en el encabezado del parte (si falta, `[PENDIENTE]`). |
| `UNIDAD_PREFECTURA` | no | Prefectura del membrete institucional. |
| `UNIDAD_COMUNA` | no | Comuna de la unidad (se indica al modelo al redactar). |
| `SESSION_SECRET` | **sí en producción** | Firma de la cookie de sesión. Sin él, el sistema queda inaccesible. |
| `USUARIOS_JSON` | **sí** | Funcionarios con acceso: `[{"id":"...","nombre":"...","grado":"...","password":"..."}]`. `grado` es opcional y se usa en el parte. |
| `DATABASE_URL` | **sí** | Va en `.env` (no `.env.local`): la CLI de Prisma solo lee `.env`. |

> Si agregas o cambias `grado`, cierra la sesión y vuelve a entrar: el grado
> viaja dentro de la cookie firmada.

> **Nunca subas claves ni contraseñas al repositorio.** `.env` y `.env.local`
> están en `.gitignore`; solo se versiona `.env.example`.

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compilación de producción. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript sin emitir. |
| `npm test` | Pruebas unitarias (runner nativo de Node + `tsx`). |
| `npm run db:migrate` | Aplica las migraciones en desarrollo. |
| `npm run db:studio` | Explorador de datos de Prisma. |
| `npm run db:use:sqlite` / `db:use:postgres` | Cambia el proveedor de la base de datos. |

---

## Estructura

```
app/
  api/            chat, borrador, casos, documentos, auth
  components/     Chat, BorradorPanel, PanelLateral, DashboardWorkspace…
  dashboard/      espacio de trabajo (protegido por sesión)
lib/              dominio: types, schemas, prompts, ia, sesion, casos, límites
lib/documentos/   ingesta, extracción, plantillas, mapeo, trazabilidad, Word
prisma/           esquema y migraciones
tests/            pruebas unitarias y de flujo
```

---

## Documentación

- [`AVANCE.md`](./AVANCE.md) — bitácora del proyecto: dónde quedó y qué sigue.
- [`DEPLOY.md`](./DEPLOY.md) — publicación en Vercel con PostgreSQL.
- [`prompt.md`](./prompt.md) — documentación de los prompts (la fuente real
  está en `lib/prompts.ts`).

---

## Cómo funciona

1. El funcionario **adjunta el acta** (DOCX, PDF o TXT) o narra el caso en el
   chat.
2. El servidor extrae el texto, lo envía al modelo por trozos y valida los
   antecedentes: **RUT, patentes, fechas, coherencia de edad, alcoholemia
   ausente y contradicciones**. No completa ni corrige valores.
3. El sistema elige la **plantilla** (parte de detenido, parte general o
   denuncia VIF) y muestra las observaciones, los campos faltantes y la
   **trazabilidad**: el extracto literal del acta que respalda cada dato.
4. Con los campos obligatorios completos (y sin contradicciones), se habilita
   **GENERAR BORRADOR**. El modelo redacta; el servidor impone el orden de las
   secciones; lo que falte queda como `[PENDIENTE]`.
5. El funcionario revisa, edita y **confirma** el borrador; se guarda en la
   base de datos con su trazabilidad y aparece en el historial.
6. Desde el visor puede **descargar el Word** con el formato institucional
   (Arial 11, interlineado 1,5, márgenes, membrete, firmas y numeración).

---

## Actas y límites

- Formatos: **TXT (UTF-8)**, **DOCX** y **PDF con capa de texto**.
- Máximo por archivo: **10 MB**; máximo de texto procesado: **40.000
  caracteres**.
- Un PDF **escaneado** (sin texto) no se procesa: la aplicación avisa que
  requiere OCR. No se simula la lectura ni se inventan antecedentes.
- El archivo se lee en el backend y **no se envía a ningún servicio distinto
  del proveedor de IA configurado**. El texto completo no se guarda en la base
  de datos: se conservan el hash, los metadatos y los extractos de respaldo.
- El Word se genera desde el borrador **ya revisado**: no vuelve a llamar a la
  IA ni incorpora datos de otros casos.
