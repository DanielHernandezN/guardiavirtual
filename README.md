# Guardia Virtual

Asistente de apoyo documental para funcionarios de guardia: extrae los
**antecedentes** de un caso a partir de la conversación, redacta el
**borrador del parte policial**, exige **revisión humana** y guarda el
historial de casos.

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
  api/            chat, borrador, casos, auth
  components/     Chat, BorradorPanel, PanelLateral, DashboardWorkspace…
  dashboard/      espacio de trabajo (protegido por sesión)
lib/              dominio: types, schemas, prompts, ia, sesion, casos, límites
prisma/           esquema y migraciones
tests/            pruebas unitarias
```

---

## Documentación

- [`AVANCE.md`](./AVANCE.md) — bitácora del proyecto: dónde quedó y qué sigue.
- [`DEPLOY.md`](./DEPLOY.md) — publicación en Vercel con PostgreSQL.
- [`prompt.md`](./prompt.md) — documentación de los prompts (la fuente real
  está en `lib/prompts.ts`).

---

## Cómo funciona

1. El funcionario narra el caso en el chat.
2. El modelo extrae los antecedentes estructurados (tipo de procedimiento,
   especie, lugar, fecha) y detecta **contradicciones** o un **cambio de
   procedimiento**.
3. Con los cuatro campos obligatorios completos (y sin contradicciones), se
   habilita **GENERAR BORRADOR**.
4. El modelo redacta las secciones del parte; lo que falte queda como
   `[PENDIENTE]`.
5. El funcionario revisa, edita y **confirma** el borrador; se guarda en la
   base de datos y aparece en el historial.
