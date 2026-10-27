# AVANCE — Guardia Virtual (Cabo Virtual)

> **Propósito de este archivo:** servir de bitácora viva del proyecto. Cada vez que se retome el trabajo, leer este documento primero para saber **dónde quedó** y **qué sigue**. Actualizarlo al terminar cada sesión o cada hito importante.

- **Última actualización:** 27/10/2026
- **Estado general:** 🟢 Funcional — Fases 0 a 8 completadas (parte de detenido con encabezado, cierre, firma y vista previa). El sistema extrae antecedentes, identifica al detenido y al personal aprehensor, redacta el borrador con el formato de la unidad, exige revisión humana, guarda los casos con historial y papelera, y cuenta con 89 pruebas, límite de uso, validación de entrada y guía de despliegue. Pendiente: despliegue real en Vercel y confirmar el formato exacto del encabezado con la unidad.
- **Último commit analizado:** `6ae4069` — "Fase 8: parte de detenido y modelo gratuito estable" (árbol de trabajo limpio).

> **Sesión 27/10/2026 — verificación de arranque:** árbol limpio, `npm test` → **89/89 ✅**, y presentes `node_modules`, `.env`, `.env.local` y `prisma/dev.db`. Se corrige la bitácora: la Fase 8 **ya está commiteada** en `6ae4069` (antes figuraba como "sin commit"). Siguiente paso sugerido: prueba real del parte de detenido y ajuste del encabezado/firma.

---

## 0. Resumen de la sesión de la Fase 8 (22/10/2026)

Se implementó la **Fase 8: plantilla del parte de detenido**, a partir del
modelo de parte aportado por el usuario (detención por robo por sorpresa).

| Área | Qué se hizo |
|------|-------------|
| Datos | `lib/types.ts`: nuevos tipos `DatosDetenido` y `DatosDetencion`; `Antecedentes` ahora incluye `detenido` y `detencion`. |
| Extracción | `lib/prompts.ts`: el modelo extrae nombre, RUT, edad, nacionalidad, estado civil, estudios, ocupación, nacimiento, domicilio, teléfono y correo del detenido; hora, fecha, delito, lugar, personal aprehensor, acompañante, vehículo y constatación de lesiones. |
| Normalización | `lib/schemas.ts`: esquemas anidados tolerantes (si no hay detención, todos los campos quedan en `null`); `lib/fecha.ts`: `normalizarHora` y `fechaDeHoy` (zona `America/Santiago`). |
| Plantilla | `lib/plantillas.ts`: `SECCIONES_DETENIDO`, `seccionesPara()` y `tituloPorTipo(tipo, detencion)` → «PARTE DE DETENIDO». |
| Redacción | El relato de HECHOS usa el estilo oficial: tercera persona, pasado y párrafos que comienzan con «Que, ». Las diligencias (derechos, esposas, calabozo, lesiones, traslado) solo se mencionan si constan. |
| Acumulación | `app/api/chat/route.ts`: los datos del detenido y de la detención se combinan campo por campo; un `cambioDeProcedimiento` los reemplaza completos. |
| UI | El chat inicializa los antecedentes con `crearAntecedentesVacios()`; el visor del borrador muestra detenido, delito y hora de detención. |
| Encabezado | `lib/plantillas.ts`: encabezado fijo con UNIDAD (variable `UNIDAD_NOMBRE`), PARTE NRO., FECHA/HORA de confección, FUNCIONARIO (sesión) y MATERIA (delito o procedimiento). Se genera en el servidor, se puede editar y se incluye al copiar, descargar e imprimir. |
| Cierre | `construirPieParte`: fórmula «Es cuanto puedo informar a Ud.», línea de firma, nombre del funcionario (con grado si está configurado) y unidad. |
| Vista previa | El visor del borrador tiene un botón **Vista previa / Editar** que muestra el documento completo con el formato de impresión. |
| Tests | 89 pruebas (`npm test`), incluidas normalización de hora, esquema anidado, detección de detención, combinación de datos, encabezado, cierre del parte y grado del funcionario. |
| Modelo | `minimax/minimax-m3.1-flash:free` fue **retirado por OpenRouter el 22/10/2026** (404). `openrouter/free` devolvía respuestas vacías de forma intermitente. Se eligió **`poolside/laguna-s-2.1:free`** para extracción y redacción: respondió en ~13 s y ~12 s respectivamente, con JSON válido y acentos correctos. Se agregaron reintentos automáticos en `lib/ia.ts`. |

**Verificación:** `npm run typecheck` ✅ · `npm run lint` ✅ 0 errores · `npm test` ✅ 89/89 · `npm run build` ✅. Además, prueba real contra `poolside/laguna-s-2.1:free` con el caso de detención por robo por sorpresa: extracción completa en ~13 s, borrador con las 5 secciones en ~12 s, encabezado y cierre incluidos.

> **Privacidad:** el parte de ejemplo contenía datos personales. En el
> repositorio solo se documenta la **estructura** del documento, nunca nombres,
> RUT, teléfonos ni correos reales.

---

## 0 bis. Resumen de la sesión anterior (21/10/2026)

Se retomó el proyecto desde `64a09d5` y se completó la **Fase 7** (calidad,
seguridad y despliegue), además de los pendientes menores anotados:

| Área | Qué se hizo |
|------|-------------|
| Errores | `lib/errores.ts` (traducción de excepciones a HTTP: 400/429/504/500), timeout del modelo (2 min), errores técnicos ocultos a la interfaz. |
| Límite de uso | `lib/limites.ts`: 20 llamadas/min por funcionario (compartido entre chat y borrador) y 20 intentos/min de login por IP. |
| Validación | `lib/validacion.ts`: cuerpo máximo 64 KB, mensaje máximo 4 000 caracteres, esquema Zod del guardado de casos, id de caso validado. |
| Tests | 68 pruebas unitarias con el runner nativo de Node + `tsx` (`npm test`). |
| UI | `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`; mensajes de error diferenciados en el chat; error visible al guardar el borrador. |
| Cabeceras | `next.config.ts`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS. |
| Datos | Tabla `Usuario` (integridad referencial con `Caso`), papelera de casos (borrado lógico + restauración). |
| Despliegue | `DEPLOY.md`, `vercel.json`, `scripts/proveedor-db.mjs` (SQLite ↔ PostgreSQL), `postinstall: prisma generate`. |
| Formato | El modelo ya no escribe *"a las [PENDIENTE]"*: usa *"a una hora no informada"*. |

**Commits de esta sesión:**
- `872ef81` — Fase 7: calidad, seguridad, pruebas y despliegue.

---

## 1. Objetivo del proyecto

Construir una **IA que ayude a confeccionar partes policiales** (partes, actuaciones, denuncias y borradores documentales) para **funcionarios de guardia en las unidades**, con el fin de:

- **Facilitar** la redacción formal de los partes.
- **Optimizar los tiempos** de creación durante la guardia.
- **Estandarizar** el formato y reducir errores de redacción.
- **Validar** los antecedentes antes de redactar (sin inventar datos).

**Límite importante:** el sistema es un *asistente documental*. No reemplaza la decisión final del funcionario ni la firma/validación oficial.

---

## 2. Stack tecnológico (decidido)

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | **Next.js 16.3.3** (App Router) | Proyecto bootstrapped con `create-next-app`. Ver reglas de `AGENTS.md`: leer docs en `node_modules/next/dist/docs/` antes de escribir código. |
| UI | **React 19.2.8** + **Tailwind CSS v4** (`@tailwindcss/postcss`) | Estilos con clases utilitarias y colores arbitrarios. |
| Lenguaje | **TypeScript 5** (strict) | |
| IA / LLM | **Proveedor configurable** (cualquier API compatible con OpenAI) | `lib/ia.ts`: `AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL` (+ `AI_MODEL_REDACCION` opcional). Por defecto OpenRouter con el modelo **gratuito** `poolside/laguna-s-2.1:free`. Compatible con OpenAI, Gemini, Groq y Mistral cambiando solo variables de entorno. |
| Estilo de API | **Rutas API de Next.js** (`app/api/...`) | |
| Despliegue objetivo | **Vercel** | Configuración lista (`vercel.json`, `DEPLOY.md`); falta la publicación real con PostgreSQL. |

> ℹ️ `node_modules` está instalado en el workspace (verificado el 27/10/2026). Si se reinstala: `npm install` con el servidor de desarrollo detenido.

### Paleta de UI (escala de oliva)

Definida como tokens de Tailwind v4 en `app/globals.css`, de **oscuro a claro**:

| Token | Hex | Uso |
|-------|-----|-----|
| `oliva-950` | `#14170f` | Fondo más oscuro (velo de modales) |
| `oliva-900` | `#1e2218` | Panel lateral del dashboard |
| `oliva-800` | `#2a2f21` | Burbuja del asistente (cabo) |
| `oliva-700` | `#3a412c` | Bordes oscuros |
| `oliva-600` | `#4e5839` | Botones primarios / texto secundario |
| `oliva-500` | `#6b7a45` | Color de marca (acento) |
| `oliva-400` | `#8a9a5b` | Acentos sobre fondo oscuro |
| `oliva-300` | `#aebb85` | Acentos, bordes claros |
| `oliva-200` | `#cfd8b0` | Burbuja del funcionario, bordes |
| `oliva-100` | `#e4e9d4` | Superficies claras (chat, banner) |
| `oliva-50` | `#f2f5e8` | Fondo de página |

Los alias semánticos (`brand`, `ink`, `surface`…) se mantienen apuntando a la escala de oliva.

### Proveedor de IA (configurable)

Todo el acceso al modelo pasa por **`lib/ia.ts`**, así que cambiar de proveedor
no requiere tocar código, solo variables de entorno:

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `AI_BASE_URL` | Endpoint del proveedor | `https://openrouter.ai/api/v1/chat/completions` |
| `AI_API_KEY` | Clave del proveedor | — (obligatoria) |
| `AI_MODEL` | Modelo de extracción (chat) | `poolside/laguna-s-2.1:free` (`.env.local`) |
| `AI_MODEL_REDACCION` | Modelo de redacción del borrador | `poolside/laguna-s-2.1:free` (si falta, usa `AI_MODEL`) |

Proveedores compatibles (formato OpenAI `chat/completions`):

| Proveedor | `AI_BASE_URL` | Costo |
|-----------|---------------|-------|
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | Modelos `:free` sin tarjeta |
| OpenAI | `https://api.openai.com/v1/chat/completions` | De pago |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | Capa gratuita |
| Groq | `https://api.groq.com/openai/v1/chat/completions` | Capa gratuita |

**Modelos gratuitos de OpenRouter** (consultados y probados el 22/10/2026):
los modelos `:free` tienen un límite de **20 req/min y 50 req/día** (1000/día
con una recarga única de $10). Resultados de la prueba con el prompt real de
redacción:

| Modelo | Resultado |
|--------|-----------|
| `poolside/laguna-s-2.1:free` | ✅ ~12 s, JSON válido, acentos correctos. **En uso.** |
| `cohere/north-mini-code:free` | ✅ ~38 s, JSON válido; omitió la constatación de lesiones. |
| `nvidia/nemotron-3.5-lightning:free` | ⚠️ Extracción correcta (~43 s), pero la redacción superó los 120 s. |
| `openrouter/free` | ❌ Respuestas vacías intermitentes. |
| `google/gemma-4-26b-a4b-it:free` | ❌ 429 del proveedor. |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | ⚠️ ~119 s, al límite del timeout. |

> ⚠️ **`minimax/minimax-m3.1-flash:free` fue retirado el 22/10/2026** al
> terminar su periodo gratuito (OpenRouter devuelve 404). Verificar la lista
> vigente en <https://openrouter.ai/models?max_price=0>. Si el modelo gratuito
> falla, se puede cambiar solo con `AI_MODEL` / `AI_MODEL_REDACCION`.

---

## 3. Estructura actual del proyecto

```
guardiavirtual/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts        # ✅ Login con rate limiting y sincronización de usuarios
│   │   │   └── logout/route.ts       # ✅ Cierre de sesión
│   │   ├── borrador/route.ts         # ✅ Generación del borrador (IA) + validaciones
│   │   ├── casos/
│   │   │   ├── route.ts              # ✅ Listado y guardado de casos
│   │   │   └── [id]/route.ts         # ✅ Ver, papelera, restaurar y borrar
│   │   └── chat/route.ts             # ✅ Endpoint de extracción de antecedentes (con IA)
│   ├── components/
│   │   ├── chat.tsx                  # ✅ UI del chat + acumulación de antecedentes
│   │   ├── BorradorPanel.tsx         # ✅ Visor editable del borrador
│   │   ├── DashboardWorkspace.tsx    # ✅ Coordinación chat + historial + visor
│   │   ├── EstadoCaso.tsx            # ✅ Faltantes y contradicciones
│   │   ├── LoginForm.tsx             # ✅ Login
│   │   ├── LogoutButton.tsx          # ✅ Cierre de sesión
│   │   └── PanelLateral.tsx          # ✅ Funcionario, filtros, búsqueda y papelera
│   ├── dashboard/
│   │   ├── error.tsx                 # ✅ Error boundary del dashboard
│   │   ├── layout.tsx                # ✅ Revalida la sesión en el servidor
│   │   └── page.tsx                 # ✅ Espacio de trabajo
│   ├── error.tsx                     # ✅ Error boundary raíz
│   ├── global-error.tsx              # ✅ Error global
│   ├── not-found.tsx                 # ✅ Página 404
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # ✅ Página de login
├── lib/
│   ├── antecedentes.ts               # ✅ Reglas de dominio
│   ├── auth-server.ts                # ✅ Sesión en el servidor
│   ├── casos.ts                      # ✅ Serialización de casos y papelera
│   ├── cliente.ts                    # ✅ Cliente HTTP del frontend
│   ├── db.ts                         # ✅ Cliente de Prisma
│   ├── errores.ts                    # ✅ Errores controlados (400/429/504/500)
│   ├── fecha.ts                      # ✅ Normalización de fechas y horas
│   ├── ia.ts                         # ✅ Cliente de IA (cualquier proveedor)
│   ├── limites.ts                    # ✅ Rate limiting
│   ├── parse.ts                      # ✅ Parseo de la salida del modelo
│   ├── plantillas.ts                 # ✅ Secciones, títulos y encabezado
│   ├── prompts.ts                    # ✅ Única fuente de prompts
│   ├── schemas.ts                    # ✅ Validación con Zod
│   ├── sesion.ts                     # ✅ Cookies firmadas y hashes
│   ├── types.ts                      # ✅ Contrato de datos
│   ├── usuarios.ts                   # ✅ Funcionarios (USUARIOS_JSON)
│   ├── usuarios-db.ts                # ✅ Sincronización con la tabla Usuario
│   └── validacion.ts                 # ✅ Validación de entradas
├── prisma/                           # ✅ Esquema, migraciones y SQLite local
├── public/
├── scripts/proveedor-db.mjs          # ✅ Cambio SQLite ↔ PostgreSQL
├── tests/                            # ✅ 89 pruebas unitarias
├── AGENTS.md
├── CLAUDE.md
├── prompt.md                         # ✅ Documentación de los prompts
├── AVANCE.md                         # ← Este archivo
├── DEPLOY.md                         # ✅ Guía de despliegue
├── eslint.config.mjs
├── next.config.ts                    # ✅ Cabeceras de seguridad
├── package.json
├── postcss.config.mjs
├── proxy.ts                          # ✅ Protección de rutas
├── tsconfig.json
└── vercel.json                       # ✅ Configuración de despliegue
```

---

## 4. Estado de cada pieza (revisión)

> Esta sección resume el estado **a fecha de hoy** (tras la Fase 8). El
> detalle histórico de cada fase está en la sección 6.

### ✅ Funciona / implementado

1. **Página de login** (`app/page.tsx`) — diseño completo y responsivo.
2. **Autenticación real** (`app/api/auth/login/route.ts`, `lib/sesion.ts`,
   `lib/usuarios.ts`) — contraseñas con `scrypt`, comparación a prueba de
   timing, token de sesión firmado con HMAC-SHA256 en cookie `HttpOnly` de
   8 h, `Secure` en producción. Sin credenciales en el repositorio.
3. **Protección de rutas** (`proxy.ts`, `app/dashboard/layout.tsx`) — `/dashboard`
   y `/api/*` exigen sesión; la verificación se repite en cada endpoint.
4. **Chat** (`app/components/chat.tsx`) — envío, historial, scroll automático,
   estados de carga, errores diferenciados.
5. **API de chat** (`app/api/chat/route.ts`) — extrae y acumula antecedentes
   con un LLM, normaliza valores vacíos a `null`, detecta contradicciones y
   cambio de procedimiento, y valida la entrada.
6. **Generación del borrador** (`app/api/borrador/route.ts`,
   `app/components/BorradorPanel.tsx`) — secciones editables, indicadores de
   completitud, copiar, descargar `.txt`, imprimir y confirmación humana
   obligatoria.
7. **Persistencia** (`prisma/`, `lib/casos.ts`) — casos y borradores en
   SQLite (desarrollo) o PostgreSQL (producción), con tabla `Usuario`
   sincronizada y clave foránea.
8. **Historial de casos** (`app/components/PanelLateral.tsx`) — filtros por
   estado, búsqueda, contador, papelera con restauración y borrado definitivo.
9. **Manejo de errores** (`lib/errores.ts`, `app/error.tsx`,
   `app/global-error.tsx`, `app/not-found.tsx`) — errores técnicos traducidos
   a mensajes comprensibles; límites 400/429/504 con `Retry-After`.
10. **Límite de uso** (`lib/limites.ts`) — 20 llamadas/min por funcionario y
    20 intentos/min de login por IP.
11. **Tests** (`tests/`) — 89 pruebas unitarias (`npm test`).
12. **Despliegue** (`DEPLOY.md`, `vercel.json`, `scripts/proveedor-db.mjs`) —
    guía completa para Vercel + PostgreSQL.
13. **Parte de detenido** (`lib/plantillas.ts`, `lib/types.ts`,
    `lib/prompts.ts`) — extrae identificación del detenido (nombre, RUT, edad,
    nacionalidad, estado civil, estudios, ocupación, nacimiento, domicilio,
    teléfono, correo) y circunstancias de la detención (hora, fecha, delito,
    lugar, personal aprehensor, acompañante, vehículo, lesiones). El borrador
    se titula «PARTE DE DETENIDO» y el relato usa el estilo «Que, …».
14. **Encabezado y cierre del parte** (`lib/plantillas.ts`,
    `app/api/borrador/route.ts`) — UNIDAD, PARTE NRO., FECHA/HORA,
    FUNCIONARIO y MATERIA al inicio; «Es cuanto puedo informar a Ud.» y firma
    al final. Se generan en el servidor, son editables y se incluyen al
    copiar, descargar e imprimir. El visor ofrece **vista previa** del
    documento completo.

### ⚠️ Deuda técnica conocida

| Pieza | Problema | Impacto |
|-------|----------|---------|
| `lib/limites.ts` | El contador vive **en memoria** (por proceso). | En un despliegue con varias instancias el límite no es global. Requiere Redis (Upstash) para ser efectivo. |
| `lib/usuarios.ts` | El hash de la contraseña se **regenera en cada arranque** (`scrypt` con sal aleatoria). | La columna `passwordHash` de la tabla `Usuario` no es estable. Al migrar los usuarios a la base de datos hay que persistir el hash. |
| `lib/usuarios-db.ts` | La sincronización con `USUARIOS_JSON` ocurre al iniciar sesión. | Un funcionario que nunca ha iniciado sesión no existe en la tabla `Usuario` (por eso `asegurarUsuario` la crea al guardar un caso). |
| `prisma/migrations` | El historial de migraciones está escrito en **SQL de SQLite**. | En PostgreSQL se usa `prisma db push` (ver `DEPLOY.md`). Si se adoptan migraciones en producción, hay que generar las de PostgreSQL aparte. |
| `prompt.md` | Sigue siendo **documentación**: el prompt real vive en `lib/prompts.ts`. | Sin impacto funcional; conviene mantenerlo sincronizado. |
| `app/api/chat/route.ts` | El estado de los antecedentes viaja en el cuerpo de la petición. | Cada mensaje reenvía el estado completo. Con casos muy largos puede llegar al límite de 64 KB. |
| `app/dashboard/page.tsx` | Datos del funcionario tomados de la sesión (correcto), pero sin lista de "agentes" a futuro. | Sin impacto actual. |

### ❌ Pendiente (lo que falta para el objetivo)

1. **Publicación real en Vercel** — requiere cuenta de Vercel y una base de
   datos PostgreSQL (el usuario debe hacerlo; la guía está en `DEPLOY.md`).
2. **Ajustes finos de la plantilla de detenido** — la estructura implementada
   se basa en el modelo aportado; si la unidad usa un formato oficial distinto
   (orden de datos, secciones o encabezado), se ajusta en `lib/plantillas.ts`.
3. **Límite de uso compartido** (Redis) si el despliegue escala a varias
   instancias.
4. **Migración de usuarios a la base de datos** con hash de contraseña
   persistente (eliminaría `USUARIOS_JSON`).

---

## 5. Hallazgos / riesgos técnicos

- ~~**Doble prompt:**~~ ✅ resuelto en la Fase 1: `lib/prompts.ts` es la única fuente y `prompt.md` quedó como documentación.
- ~~**`"pendiente"` vs `null`:**~~ ✅ resuelto: el modelo devuelve `null` y `lib/schemas.ts` lo normaliza.
- ~~**Alucinación sin validación:**~~ ✅ mitigado: esquema Zod de salida, regla de no invención en el prompt y revisión humana obligatoria antes de confirmar.
- **Seguridad:** la API key vive en variables de entorno del servidor (correcto). Nunca debe ir al cliente. Revisar que no se filtren claves en logs.
- **Costos LLM:** `temperature: 0` y `response_format: json_object` son buenas prácticas. Considerar caché y límites de tokens.
- ~~**Estado en cliente:**~~ ✅ resuelto en la Fase 5: los casos se guardan en base de datos con historial y papelera. El caso en curso sigue en memoria hasta guardarlo.
- **Validación de identidad:** el sistema transcribe el RUT tal como lo entrega el funcionario, pero **no valida el dígito verificador** ni compara nombres (el parte de ejemplo traía al aprehensor con el mismo nombre del detenido). Conviene agregar validación de RUT y una alerta cuando el detenido y el aprehensor coincidan.
- **Datos ambiguos:** expresiones como "arma o cuchillo" se conservan tal cual (no se inventa el objeto). La interfaz no obliga a precisarlas; el funcionario debe revisarlas antes de confirmar.
- **Privacidad:** los casos guardan datos personales (nombre, RUT, domicilio, teléfono, correo). La base debe estar protegida y no se deben incluir partes reales en el repositorio ni en los tests.

---

## 6. Ruta de construcción — de inicio a fin

> Convención: cada fase se marca como `[ ]` (pendiente), `[~]` (en curso), `[x]` (completada). Actualizar al avanzar.

### Fase 0 — Fundamentos y entorno — ✅ COMPLETADA
- [x] `npm install` y verificar que `next dev` arranca. → Instalado (358 paquetes). `next dev` arranca en ~1.2s y sirve `/` (200), `/dashboard` (200) y `/api/chat`.
- [x] Crear `.env.example` con `OPENROUTER_API_KEY` y `OPENROUTER_MODEL`. → Creado con guía y alternativa OpenAI.
- [x] Renombrar `metadata` del `layout.tsx`. → "Cabo Virtual — Guardia Virtual".
- [x] Verificar `LayoutProps<"/">` en las docs de Next 16. → **Válido**: helper global sin importar (docs `01-app/01-getting-started/03-layouts-and-pages.md`).
- [x] Definir colores de marca y corregir `hover:bg-[#721212]`. → Tokens en `globals.css` (`@theme`): `brand`, `brand-dark`, `accent`, `ink`, `ink-soft`, `surface`, `surface-alt`. Aplicados en `page.tsx`, `dashboard/page.tsx`, `LoginForm.tsx` y `chat.tsx`.

**Verificación de la Fase 0 (resultados):**
- `npx next typegen` → ✅ Tipos generados.
- `npx eslint .` → ✅ 0 errores.
- `npm run build` → ✅ Compila (Turbopack), TypeScript OK, rutas `/`, `/_not-found`, `/api/chat`, `/dashboard`.
- Servidor dev: `/` 200, `/dashboard` 200, `POST /api/chat` 500 controlado ("Falta OPENROUTER_API_KEY...").
- Nota: `node_modules` no venía instalado; se instaló en esta sesión.
- `.gitattributes` (nuevo): `* text=auto eol=lf` + reglas para binarios, `*.bat/*.cmd` (CRLF) y diffs. Normaliza finales de línea y elimina los warnings "LF/CRLF will be replaced by ...". Los archivos de texto rastreados se convirtieron a LF.

**Commits de la Fase 0 (rama `main`):**
- `221d3be` — Fase 0: entorno, metadata y tokens de marca.
- `9e8f61a` — Agrega `.gitattributes`.
- `98d062a` — Fija `eol=lf` y normaliza finales de línea.

### Fase 1 — Unificar el "cerebro" (prompts) — ✅ COMPLETADA
- [x] Elegir **una sola fuente** para los prompts: `lib/prompts.ts` (`PROMPT_EXTRAER_ANTECEDENTES` + `construirMensajeUsuario`). El prompt inline de `route.ts` fue eliminado.
- [x] Unificar formato de salida: el modelo devuelve `null` (nunca `"pendiente"`); el servidor normaliza con Zod y calcula `faltantes`/`puedeConfeccionarBorrador`. `prompt.md` se convirtió en documentación que referencia `lib/prompts.ts`.
- [x] Definir y documentar la estructura de datos: `lib/types.ts` (`Antecedentes`, `CAMPOS_OBLIGATORIOS`, `ResultadoAnalisis`).
- [x] Validar la salida del modelo con esquema Zod: `lib/schemas.ts` (`esquemaAntecedentes`) normaliza y valida.

**Archivos nuevos en esta fase:**
- `lib/types.ts` — contrato de datos del dominio.
- `lib/schemas.ts` — validación/normalización con Zod.
- `lib/prompts.ts` — única fuente de prompts.
- `lib/antecedentes.ts` — helpers de dominio (`camposFaltantes`, `formatoLista`, `crearRespuestaConversacional`).

**Archivos modificados:** `app/api/chat/route.ts` (usa las librerías), `app/components/chat.tsx` (tipos compartidos, acepta `null`), `prompt.md` (documentación).

**Verificación:** `next typegen` ✅, `eslint` ✅ 0 errores, `next build` ✅. Prueba unitaria del esquema Zod: ausencias/`"pendiente"`/`"sin información"` → `null`, números → texto, listas limpias.

### Fase 2 — Extracción de antecedentes — ✅ COMPLETADA
- [x] Endpoint `/api/chat` con IA.
- [x] UI de chat con acumulación.
- [x] Validar `fecha` en formato `dd/mm/yyyy`: `lib/fecha.ts` (`normalizarFecha`) acepta `dd/mm/yyyy`, ISO, `dd-mm-yyyy`, `dd.mm.yyyy` y texto ("12 de junio de 2026"); si es inválida → `null` (no se inventa). Aplicado en el esquema (`textoFecha`).
- [x] Mejorar manejo de `contradicciones` y presentarlas en la UI: componente `app/components/EstadoCaso.tsx` muestra faltantes y contradicciones (con aviso ámbar) y el estado "listo para generar el borrador".
- [x] **Las contradicciones bloquean el borrador** (`puedeRedactarBorrador` en `lib/antecedentes.ts`): no se puede redactar un parte que mezcle dos procedimientos distintos. Se aplica en la UI (oculta "GENERAR BORRADOR") **y en el servidor** (`POST /api/borrador` → `409`). El prompt se reforzó para que el modelo lo detecte explícitamente.
- [x] **Cambio de procedimiento sin callejón sin salida**: el modelo devuelve `cambioDeProcedimiento` y, cuando es `true`, el servidor **reemplaza** el estado acumulado en vez de mezclarlo (el caso nuevo no hereda datos del anterior). La UI ofrece "Continuar con este caso" para descartar la contradicción y seguir adelante. Antes el modelo conservaba los antecedentes anteriores y el funcionario quedaba en un bucle de mensajes repetidos.
- [x] Corregir tipos en `chat.tsx` (aceptar `null`) y limpiar payload (hecho en Fase 1).

**Verificación:** `normalizarFecha` probado (varios formatos → `dd/mm/yyyy`; fechas inválidas y años bisiestos correctamente). `next typegen` ✅, `eslint` ✅, `next build` ✅.

### Fase 3 — Núcleo: generación del borrador del parte policial — ✅ COMPLETADA
- [x] Nuevo endpoint `POST /api/borrador` (rechaza con 400 si falta algún campo obligatorio).
- [x] Prompt de redacción (`PROMPT_REDAR_PARTE`) con estructura formal: ANTECEDENTES, HECHOS, ESPECIES INVOLUCRADAS, CONCLUSIÓN.
- [x] Plantilla según `tipoProcedimiento` (`lib/plantillas.ts`: `tituloPorTipo` + `SECCIONES_PARTE`).
- [x] Regla estricta de no invención: el prompt exige usar solo los antecedentes y escribir `[PENDIENTE]` donde falte un dato.
- [x] UI `app/components/BorradorPanel.tsx`: ver, editar (título + secciones), copiar, descargar `.txt` e imprimir.
- [x] Revisión humana obligatoria: checkbox "He revisado y valido…" que habilita "Confirmar borrador".

**Archivos nuevos en esta fase:** `lib/plantillas.ts`, `lib/parse.ts`, `app/api/borrador/route.ts`, `app/components/BorradorPanel.tsx`.
**Archivos modificados:** `lib/prompts.ts`, `lib/schemas.ts`, `lib/types.ts`, `app/api/chat/route.ts`, `app/components/chat.tsx`.

**Verificación:** `next typegen` ✅, `eslint` ✅ 0 errores, `next build` ✅ (ruta `/api/borrador` registrada). Esquema Zod del borrador validado. Endpoint probado: 400 si faltan campos, error controlado si falta clave.

### Fase 4 — Autenticación y sesiones — ✅ COMPLETADA
- [x] Autenticación real: login contra `lib/usuarios.ts` con contraseñas hasheadas (`scrypt`) y comparación a prueba de timing. Token de sesión firmado con HMAC-SHA256, en cookie `HttpOnly` + `SameSite=Lax`, con expiración de 8 h.
- [x] Protección de rutas: `proxy.ts` (convención Next 16, antes `middleware`) bloquea `/dashboard` y `/api/*` sin sesión; `app/dashboard/layout.tsx` revalida en el servidor; cada endpoint de IA (`/api/chat`, `/api/borrador`) también valida la sesión (401).
- [x] Redirección login → dashboard: `app/page.tsx` redirige al dashboard si ya hay sesión; el dashboard redirige al login si no la hay.
- [x] Cierre de sesión: `POST /api/auth/logout` caduca la cookie + botón "CERRAR SESIÓN" en el panel lateral.

**Archivos nuevos:** `lib/sesion.ts` (criptografía pura), `lib/usuarios.ts`, `lib/auth-server.ts` (wrapper de `next/headers`), `proxy.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/dashboard/layout.tsx`, `app/components/LogoutButton.tsx`.
**Archivos modificados:** `app/page.tsx`, `app/dashboard/page.tsx`, `app/components/LoginForm.tsx`, `app/api/chat/route.ts`, `app/api/borrador/route.ts`, `.env.example`.

**Variables de entorno obligatorias:** `SESSION_SECRET` (firma de la sesión) y `USUARIOS_JSON` (lista de funcionarios).

**Endurecimiento de seguridad aplicado:**
- `SESSION_SECRET` es **obligatorio en producción**: si falta, el sistema queda inaccesible (fallo cerrado) en vez de usar un secreto por defecto que permitiría falsificar cookies.
- **No hay credenciales en el repositorio**: `USUARIOS_JSON` es obligatoria. Si falta o es inválida, nadie puede autenticarse y el login responde `503`.
- La verificación se hace en el proxy **y** en cada endpoint/layout. La guía de Next 16 recomienda no depender únicamente del proxy.

### Fase 5 — Persistencia y gestión de casos — ✅ COMPLETADA
- [x] Base de datos: **SQLite local con Prisma 6.19.3** (estable; se descartó Prisma 7/8 RC porque exige `prisma.config.ts` y un driver adapter nativo). Migrar a Postgres es cambiar `provider` en `prisma/schema.prisma` + la `DATABASE_URL`.
- [x] Modelos (`prisma/schema.prisma`): `Caso` (titulo, tipo, especie, lugar, fecha, estado, antecedentes JSON, usuarioId) y `Borrador` (titulo, secciones JSON, texto, estado, generadoEn, confirmadoEn) con relación `onDelete: Cascade`.
- [x] Migración inicial aplicada (`prisma/migrations/20261021015443_init`).
- [x] API: `GET/POST /api/casos` (listar y guardar) y `GET/DELETE /api/casos/[id]`.
- [x] Panel lateral con el **historial de casos**: listar, abrir un caso guardado (reabre su borrador), botón "+ Nuevo" (reinicia el chat).
- [x] Guardar y confirmar borradores: botones "Guardar" y "Confirmar borrador" en el visor, que persisten con sus ediciones.
- [x] El usuario (`usuarioId`) sigue viniendo de `USUARIOS_JSON`; la tabla `Usuario` en base de datos queda para más adelante.

**Archivos nuevos:** `prisma/schema.prisma`, `prisma/migrations/`, `lib/db.ts`, `lib/casos.ts`, `app/api/casos/route.ts`, `app/api/casos/[id]/route.ts`, `app/components/DashboardWorkspace.tsx`, `app/components/PanelLateral.tsx`.
**Archivos modificados:** `app/dashboard/page.tsx`, `app/components/chat.tsx`, `app/components/BorradorPanel.tsx`, `package.json` (scripts `db:*`), `.gitignore` (ignora `prisma/*.db`), `.env` / `.env.example` / `.env.local`.

**Nota de configuración:** `DATABASE_URL` va en el archivo **`.env`** (no `.env.local`), porque la CLI de Prisma solo lee `.env`. Next.js también carga `.env`, así que la app usa la misma conexión.

**Scripts útiles:** `npm run db:migrate` (aplica migraciones), `npm run db:studio` (explorador de datos), `npm run db:generate`.

### Fase 6 — UI/UX del dashboard — ✅ COMPLETADA
- [x] Panel lateral con los datos reales del funcionario en sesión (nombre e ID) y botón de cierre de sesión.
- [x] Historial de casos con **filtros por estado** (Todos / En borrador / Confirmados), **búsqueda** por título, lugar o especie, y contador de casos.
- [x] **Eliminar caso** desde la lista (con confirmación), ya que el endpoint existía pero no tenía interfaz.
- [x] Vista de borrador con **indicadores de completitud**: resumen de antecedentes (procedimiento, especie, lugar, fecha) y listado de los datos que quedaron como `[PENDIENTE]`, con el nombre de cada campo.
- [x] Estado vacío del chat con instrucciones de qué datos se necesitan.
- [x] Diferenciar visualmente mensajes funcionario vs. asistente.
- [x] Paleta de UI en tonos de verde olivo (escala de 11 tokens, de oscuro a claro). Ver "Paleta de UI".

### Fase 7 — Calidad, seguridad y despliegue — ✅ COMPLETADA (falta el despliegue real)
- [x] **Manejo de errores y estados de carga en toda la UI**: `app/error.tsx` (dashboard), `app/global-error.tsx`, `app/not-found.tsx`; errores del chat con estilo propio; error visible al guardar un borrador; mensajes vacíos del cliente sin romper la interfaz.
- [x] **Protección de endpoints, rate limiting y validación de entrada**:
  - `lib/limites.ts`: 20 llamadas/min por funcionario (clave `ia:<id>`), compartido entre `/api/chat` y `/api/borrador`; 20 intentos/min de login por IP (clave `login:<ip>`). Respuesta `429` con cabecera `Retry-After`.
  - `lib/validacion.ts`: `leerJsonLimitado` (64 KB, 413 si se excede), `esquemaMensaje` (4 000 caracteres), `esquemaGuardarCaso` (secciones, títulos, borradores acotados).
  - `lib/errores.ts`: `ErrorEntradaInvalida`, `ErrorLimiteProveedor` (429), `ErrorTiempoAgotado` (504) y traducción de fallos de red/Zod a mensajes comprensibles.
  - `lib/ia.ts`: tiempo máximo de espera (2 min) con `AbortSignal.timeout`; el 429 del proveedor se distingue del error genérico.
  - `app/api/casos/[id]`: se valida el formato del id antes de consultar la base de datos.
  - Cookie de sesión con `Secure` en producción.
- [x] **Tests (extracción, validación de borrador, auth)**: 68 pruebas con el runner nativo de Node (`node --import tsx --test`). Cubren: normalización de antecedentes y fechas, reglas de dominio (faltantes y contradicciones), esquemas Zod, hash y verificación de contraseñas, ciclo de vida del token de sesión, usuarios del entorno, límite de uso, validación de entrada, traducción de errores, cliente HTTP del frontend, casos y papelera, plantillas del parte y parseo de la salida del modelo.
- [x] **Despliegue en Vercel + base de datos**: `DEPLOY.md` con el procedimiento completo; `vercel.json` con el comando de compilación; `scripts/proveedor-db.mjs` para cambiar entre SQLite y PostgreSQL; `postinstall: prisma generate`.
- [x] **Variables de entorno en producción**: documentadas en `DEPLOY.md` y `.env.example`. `SESSION_SECRET` y `USUARIOS_JSON` siguen siendo obligatorias (fallo cerrado).
- [x] **Cabeceras de seguridad** en `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- [ ] **Publicar en Vercel** (requiere una cuenta de Vercel y una base de datos PostgreSQL: queda en manos del usuario).

**Archivos nuevos en esta fase:** `lib/errores.ts`, `lib/limites.ts`, `lib/validacion.ts`, `lib/cliente.ts`, `lib/usuarios-db.ts`, `app/error.tsx` (global-error y not-found), `app/dashboard/error.tsx`, `tests/*.test.ts` (4 archivos), `scripts/proveedor-db.mjs`, `DEPLOY.md`, `vercel.json`.
**Archivos modificados:** `lib/ia.ts`, `lib/casos.ts`, `lib/prompts.ts`, `app/api/chat/route.ts`, `app/api/borrador/route.ts`, `app/api/casos/route.ts`, `app/api/casos/[id]/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/components/chat.tsx`, `app/components/LoginForm.tsx`, `app/components/LogoutButton.tsx`, `app/components/PanelLateral.tsx`, `app/components/DashboardWorkspace.tsx`, `app/components/BorradorPanel.tsx`, `prisma/schema.prisma`, `next.config.ts`, `package.json`, `README.md`, `.env.example`.

**Verificación:** `npm run typecheck` ✅ · `npm run lint` ✅ 0 errores · `npm test` ✅ 68/68 · `npm run build` ✅ · pruebas manuales contra el servidor de desarrollo (login, extracción de antecedentes, generación de borrador, guardado de caso, papelera, rate limit 429, cabeceras de seguridad).

### Fase 7 bis — Pendientes menores resueltos
- [x] **Hora en los partes:** el prompt de redacción prohíbe *"a las [PENDIENTE]"* y exige *"a una hora no informada"*. Verificado en una generación real.
- [x] **Usuario en base de datos:** existe la tabla `Usuario`, sincronizada con `USUARIOS_JSON` al iniciar sesión (`lib/usuarios-db.ts`), con clave foránea desde `Caso` y bandera `activo` para desactivar accesos.
- [x] **Papelera de casos:** el borrado es lógico (`eliminadoEn`); se puede restaurar desde el panel lateral y vaciar la papelera con borrado definitivo.

### Fase 8 — Plantilla del parte de detenido — ✅ IMPLEMENTADA (sujeta a ajustes)
> El usuario aportó un modelo real de parte de detenido (detención por robo
> por sorpresa) y se implementó su estructura. Si la unidad entrega un formato
> oficial distinto, se ajusta en `lib/plantillas.ts`.

- [x] Recibir el documento modelo de la unidad. → Aportado por el usuario
      (relato en tercera persona con párrafos «Que, …»).
- [x] Modelar los datos del detenido como campos estructurados:
      `DatosDetenido` en `lib/types.ts`.
- [x] Modelar las circunstancias de la detención: `DatosDetencion`
      (hora, fecha, delito, lugar, personal aprehensor, acompañante, vehículo,
      constatación de lesiones).
- [x] Extraer esos datos con el modelo (`PROMPT_EXTRAER_ANTECEDENTES`),
      normalizarlos con Zod y acumularlos entre mensajes (`combinarDatos`).
- [x] Plantilla de secciones (`SECCIONES_DETENIDO`): IDENTIFICACIÓN DEL
      DETENIDO, CIRCUNSTANCIAS DE LA DETENCIÓN, HECHOS, ESPECIES INVOLUCRADAS
      y DERECHOS Y TRASLADO.
- [x] Estilo del relato: tercera persona, pasado, párrafos que comienzan con
      «Que, », sin inventar diligencias.
- [x] Título «PARTE DE DETENIDO» cuando hay detención, aunque el delito sea
      robo, hurto u otro (`tituloPorTipo(tipo, detencion)`).
- [x] Encabezado fijo del documento: UNIDAD (variable `UNIDAD_NOMBRE`),
      PARTE NRO., FECHA y HORA de confección, FUNCIONARIO (sesión) y MATERIA
      (delito o procedimiento). Se arma en el servidor y es editable.
- [x] Cierre del documento: «Es cuanto puedo informar a Ud.», línea de firma,
      nombre del funcionario y unidad (`construirPieParte`).
- [x] Grado del funcionario opcional en `USUARIOS_JSON` (`grado`), incluido en
      el encabezado y en la firma.
- [x] Vista previa del documento completo antes de imprimir o confirmar.
- [x] Modelo gratuito estable (`poolside/laguna-s-2.1:free`) y reintentos
      automáticos ante respuestas vacías, 5xx, 429 y fallos de red.
- [x] Tests y verificación completa (`typecheck`, `lint`, `test`, `build`).

**Pendiente de esta fase:** confirmar con la unidad el **formato exacto** del
encabezado (por ejemplo, si lleva repartición, folio o timbre) y el grado que
debe figurar en la firma. El encabezado y el cierre son editables y se adaptan
cambiando sus funciones en `lib/plantillas.ts`; el grado se configura en
`USUARIOS_JSON`.

---

## 7. Dónde quedamos (resumen para retomar)

- **Fases 0 a 8 completadas.** El sistema, con IA real (OpenRouter, modelo
  gratuito), extrae antecedentes, **identifica al detenido y al personal
  aprehensor**, redacta el borrador del parte con secciones editables, exige
  revisión humana, **guarda los casos y borradores en base de datos** (SQLite +
  Prisma, con tabla `Usuario` y papelera) y ofrece historial con filtros,
  búsqueda, restauración y borrado definitivo.
- **Parte de detenido:** cuando el procedimiento incluye una detención, el
  documento se titula «PARTE DE DETENIDO» y usa las secciones IDENTIFICACIÓN
  DEL DETENIDO, CIRCUNSTANCIAS DE LA DETENCIÓN, HECHOS, ESPECIES INVOLUCRADAS
  y DERECHOS Y TRASLADO. El relato sigue el estilo de la unidad: tercera
  persona, pasado y párrafos «Que, …».
- **Documento completo:** encabezado fijo (Unidad, N.° de parte, fecha/hora,
  funcionario y materia), cuerpo editable y cierre con firma. El visor permite
  alternar entre edición y **vista previa**.
- **Calidad y seguridad:** 89 pruebas unitarias, rate limiting por funcionario
  y por IP, validación de entradas y del tamaño de las peticiones, timeout del
  modelo, errores traducidos a HTTP (400/429/504/500), cabeceras de seguridad
  y páginas de error propias.
- **Despliegue preparado:** `DEPLOY.md` + `vercel.json` + script de cambio de
  proveedor de base de datos. Falta solo la publicación real (requiere cuenta
  de Vercel y PostgreSQL).
- **Detecta procedimientos mezclados**: si el funcionario narra un caso
  distinto al ya conversado, la IA lo señala como contradicción, **el borrador
  queda bloqueado** y el funcionario puede resolverlo con un clic ("Continuar
  con este caso") o abrir un caso nuevo. El caso nuevo **no hereda** datos del
  anterior.
- **Autenticación real** con sesión firmada, `proxy.ts` + validación por
  endpoint, y credenciales solo en `.env.local`.
- **UI en paleta de verde olivo** con burbujas diferenciadas (funcionario /
  asistente / error).

### Próximos pasos inmediatos (sugeridos)
1. **Publicar en Vercel** (último paso de la Fase 7): crear la base de datos
   PostgreSQL, configurar las variables de entorno y desplegar. Guía en
   `DEPLOY.md`.
2. **Confirmar el formato exacto del encabezado y la firma**: si la unidad usa
   repartición, folio, timbre o grado en la firma, se ajusta en
   `construirEncabezadoParte` / `construirPieParte` (`lib/plantillas.ts`).
   Hoy se completan Unidad, N.° de parte, fecha/hora, funcionario y materia,
   más el cierre «Es cuanto puedo informar a Ud.» con línea de firma.
3. Probar el parte de detenido con un caso real completo y ajustar la
   redacción (orden de diligencias, denominación del delito, formato de horas).
4. **Límite de uso distribuido:** el contador de `lib/limites.ts` vive en
   memoria; en un despliegue con varias instancias hay que moverlo a Redis
   (Upstash) para que el límite sea global.

### Pendientes menores anotados
- ~~**Hora en los partes:**~~ ✅ resuelto en la Fase 7 (el modelo usa
  *"a una hora no informada"*).
- ~~**Usuario en base de datos:**~~ ✅ resuelto en la Fase 7 (tabla `Usuario`
  sincronizada con `USUARIOS_JSON`).
- ~~**Eliminar casos:**~~ ✅ resuelto en la Fase 7 (papelera con restauración
  y borrado definitivo).

### Configuración local (qué se debe completar en `.env.local`)

| Variable | Estado | Notas |
|----------|--------|-------|
| `AI_BASE_URL` | ✅ definido | OpenRouter |
| `AI_API_KEY` | ✅ definido | Clave de OpenRouter: `sk-or-v1-20...b7753` (huella; la clave completa vive solo en `.env.local`) |
| `AI_MODEL` | ✅ definido | `poolside/laguna-s-2.1:free` (extracción) |
| `AI_MODEL_REDACCION` | ✅ definido | `poolside/laguna-s-2.1:free` (redacción; si falta, usa `AI_MODEL`) |
| `SESSION_SECRET` | ✅ definido | Generado aleatoriamente |
| `USUARIOS_JSON` | ✅ definido | ID `daniel`; el campo opcional `grado` se usa en el encabezado y la firma |
| `UNIDAD_NOMBRE` | ⬜ opcional | Nombre de la unidad para el encabezado; si falta se escribe `[PENDIENTE]` |
| `DATABASE_URL` | ✅ definido | En `.env` (SQLite local: `file:./dev.db`) |

> En producción, `SESSION_SECRET` y `USUARIOS_JSON` son **obligatorias** y
> `DATABASE_URL` debe apuntar a PostgreSQL. Ver `DEPLOY.md`.

**Nunca escribir la clave completa en este archivo ni en ningún archivo versionado.**
`.env.local` está en `.gitignore` y no se sube a GitHub. Para configurarla:

```powershell
$key = Read-Host "Pega tu clave de OpenRouter"
(Get-Content .env.local) -replace '^AI_API_KEY=.*$', "AI_API_KEY=$key" | Set-Content .env.local
```

Next 16 recarga `.env.local` en caliente: no hace falta reiniciar el servidor.

---

## 8. Problemas conocidos y soluciones

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `Module not found: Can't resolve 'nanoid/non-secure'` o `source-map-js` | Caché de Turbopack corrupta tras una instalación interrumpida | `Remove-Item -Recurse -Force .next` y volver a compilar |
| `Could not find the Next.js package (next/package.json)` | `node_modules` a medio instalar mientras corría el dev server | Detener el server, `npm ci`, `npx prisma generate` |
| `EPERM: unlink ... .node` en `npm ci` | El dev server tiene bloqueado un módulo nativo | Detener el dev server antes de `npm ci` |
| `@prisma/client did not initialize yet` | Falta generar el cliente | `npm run db:generate` |
| `Environment variable not found: DATABASE_URL` | La CLI de Prisma solo lee `.env` | `DATABASE_URL` va en `.env` (no en `.env.local`) |
| `Environment variable not found: DATABASE_URL` al ejecutar un script con `node` | Node no carga `.env` de forma automática (solo Next.js lo hace) | `$env:DATABASE_URL = "file:./dev.db"` antes de ejecutar el script, o usar `npx prisma ...` |
| Avisos `LF will be replaced by CRLF` | `core.autocrlf` de Windows | Normalizado con `.gitattributes` (`eol=lf`) |
| `npm test` no encuentra los módulos `@/lib/...` | El runner nativo no aplica los alias de `tsconfig` | `tsx` los resuelve: siempre usar `npm test` (no `node --test` a secas) |
| `PrismaClientInitializationError` al abrir la base de datos | El cliente no se generó tras cambiar el esquema | `npm run db:generate` |

> **Antes de una instalación:** detener siempre el dev server. En Windows deja
> bloqueados los módulos nativos de `node_modules`.

## 9. Convenciones de trabajo

- Documentar en **español**.
- **Usar español neutro** en toda la interfaz, la documentación y los prompts:
  sin voseo (vos, podés, contame, revisá) ni modismos regionales (aquí, che,
  laburo). El texto puede terminar en un documento oficial. Esta regla también
  se le indica al modelo de IA en `lib/prompts.ts`.
- **El asistente también se comunica en español neutro** (indicación explícita
  del usuario).
- Actualizar este `AVANCE.md` al final de cada sesión (marcar casillas y anotar bloqueos).
- Mantener la regla de `AGENTS.md`: leer las docs de Next en `node_modules/next/dist/docs/` antes de escribir código nuevo.
- No inventar datos en los partes: es requisito del dominio policial.
- **Antes de dar por terminada una fase:** `npm run typecheck`, `npm run lint`,
  `npm test` y `npm run build` en verde, y pruebas manuales contra el servidor
  de desarrollo.
- **Los secretos no se versionan:** claves de IA, `SESSION_SECRET` y
  `USUARIOS_JSON` viven solo en `.env` / `.env.local`. En `AVANCE.md` y
  documentos se anota solo la huella o el nombre de la variable.
