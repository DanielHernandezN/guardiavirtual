# Guardia Virtual

Asistente de apoyo documental para funcionarios de guardia: convierte el relato
o el acta de aprehensión en un **borrador de parte policial** con el formato de
la unidad, listo para revisar, confirmar y descargar en **Word**.

> Es un *asistente documental*: no reemplaza la decisión del funcionario ni la
> firma oficial. **Nunca inventa datos**: lo que no consta queda como
> `[PENDIENTE]` para revisión humana.

Presentación comercial: 

---

## Qué problema resuelve

Confeccionar un parte consume tiempo de guardia, exige redacción formal en
tercera persona y cualquier omisión o error de formato cuesta caro. Guardia
Virtual automatiza lo mecánico:

1. El funcionario **narra la idea con sus palabras** (o pega el acta completa).
2. La IA **extrae los antecedentes** (procedimiento, lugar, fecha, detenido,
   aprehensores, fiscal, testigos, víctimas) y confirma lo entendido.
3. Con un clic, **redacta el borrador** con las secciones de la plantilla
   (relato, lesiones, instrucciones del fiscal, firmas).
4. El funcionario **revisa, edita y confirma**; el caso queda guardado con
   historial y trazabilidad.
5. Descarga el **Word institucional** listo para firmar.

Tiempos medidos (IA gratuita): extracción ~1,5 s, redacción ~17 s.

## Funcionalidades

- Chat en modo libre con extracción estructurada y validación (RUT, patentes,
  fechas, contradicciones).
- Ingesta de actas **TXT, DOCX y PDF con texto** (10 MB, 40.000 caracteres).
- Trazabilidad por campo con extracto literal de respaldo.
- Roles **ADMIN / FUNCIONARIO** y panel de administración de usuarios.
- Historial con búsqueda, papelera, restauración y borrado definitivo.
- Interfaz responsive (celular, tablet, escritorio).
- 141 pruebas automatizadas.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| App | Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS v4 |
| IA | API compatible con OpenAI (`lib/ia.ts`); Groq por defecto |
| Datos | Prisma 6 + SQLite (desarrollo) / PostgreSQL Neon (producción) |
| Documentos | `mammoth` (DOCX), `unpdf` (PDF), `docx` (Word de salida) |
| Auth | Contraseñas `scrypt`, sesión HMAC-SHA256 en cookie HttpOnly |
| Deploy | Vercel |

---

## Cómo hacerlo funcionar (local)

Requisitos: Node.js 20+ y una clave gratuita de
[Groq](https://console.groq.com/keys) (sin tarjeta).

```powershell
npm install
Copy-Item .env.example .env.local
Copy-Item .env.example .env
npm run db:migrate
npm run dev
```

La aplicación queda en <http://localhost:3000>.

### 1. Configurar la IA (en `.env.local`)

```ini
AI_BASE_URL=https://api.groq.com/openai/v1/chat/completions
AI_API_KEY=gsk_tu_clave
AI_MODEL=openai/gpt-oss-20b
AI_MODEL_REDACCION=openai/gpt-oss-20b
```

Sin tarjeta: Groq gratuita (30 req/min, 1.000 req/día). Para otro proveedor
(OpenAI, Gemini, Mistral, OpenRouter) basta cambiar estas 4 variables.

### 2. Secreto de sesión (en `.env.local`)

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Pega el valor en `SESSION_SECRET`.

### 3. Crear el primer administrador

```powershell
npm run usuarios -- crear --id daniel --nombre "Nombre completo" --rol ADMIN
```

La contraseña se pide por teclado. El resto de los funcionarios se crean desde
`/dashboard/usuarios`.

### 4. Verificar

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

> **Nunca subas claves ni contraseñas al repositorio.** `.env` y `.env.local`
> están en `.gitignore`; solo se versiona `.env.example`.

---

## Producción

Ver [`DEPLOY.md`](./DEPLOY.md): Vercel + PostgreSQL (Neon), variables cifradas
y alta del primer administrador. Demo:
<https://guardiavirtual.vercel.app>.

## Estructura

```
app/
  api/            chat, borrador, casos, documentos, auth, usuarios
  components/     Chat, BorradorPanel, PanelLateral, DashboardWorkspace…
  dashboard/      espacio de trabajo (protegido por sesión)
lib/              dominio: types, schemas, prompts, ia, sesion, casos, límites
lib/documentos/   ingesta, extracción, plantillas, mapeo, trazabilidad, Word
prisma/           esquema y migraciones
tests/            141 pruebas unitarias y de flujo
```

## Documentación

- [`PRESENTACION.md`](./PRESENTACION.md) — resumen para presentar u ofrecer el software.
- [`AVANCE.md`](./AVANCE.md) — bitácora del proyecto.
- [`DEPLOY.md`](./DEPLOY.md) — despliegue en Vercel con PostgreSQL.
- [`prompt.md`](./prompt.md) — documentación de los prompts (la fuente real es
  `lib/prompts.ts`).

---

*Beta cerrada el 31/10/2026. Estado: funcional en producción; pendiente solo la
validación con un caso real completo.*
