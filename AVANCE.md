# AVANCE — Guardia Virtual (Cabo Virtual)

> **Propósito de este archivo:** servir de bitácora viva del proyecto. Cada vez que se retome el trabajo, leer este documento primero para saber **dónde quedó** y **qué sigue**. Actualizarlo al terminar cada sesión o cada hito importante.

- **Última actualización:** 20/10/2026
- **Estado general:** 🟡 En desarrollo — **Fase 0 completada**. Flujo de chat y extracción de antecedentes operativo (local). Pendiente el núcleo del producto (generación del parte policial).
- **Último commit analizado:** `44edcce` — "elimina responder / responderCabo() termina de dar la lógica y se integra IA mediante API"

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
| IA / LLM | **Proveedor configurable** (cualquier API compatible con OpenAI) | `lib/ia.ts`: `AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL`. Por defecto OpenRouter con modelo **gratuito** `minimax/minimax-m3.1-flash:free`. Compatible con OpenAI, Gemini, Groq y Mistral cambiando solo variables de entorno. |
| Estilo de API | **Rutas API de Next.js** (`app/api/...`) | |
| Despliegue objetivo | **Vercel** (sugerido) | Aún no configurado. |

> ⚠️ `node_modules` **no está instalado** en el workspace actual. Antes de compilar: `npm install`.

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
| `AI_MODEL` | Identificador del modelo | `minimax/minimax-m3.1-flash:free` |

Proveedores compatibles (formato OpenAI `chat/completions`):

| Proveedor | `AI_BASE_URL` | Costo |
|-----------|---------------|-------|
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | Modelos `:free` sin tarjeta |
| OpenAI | `https://api.openai.com/v1/chat/completions` | De pago |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | Capa gratuita |
| Groq | `https://api.groq.com/openai/v1/chat/completions` | Capa gratuita |

**Modelos gratuitos de OpenRouter** (verificados contra la API, oct-2026): 18
gratuitos, de los cuales **9 soportan `response_format`** (requisito para que
Zod valide la respuesta). Límites: 20 req/min y 50 req/día (1000/día con una
recarga única de $10). Los que sirven: `minimax/minimax-m3.1-flash:free`,
`nvidia/nemotron-3.5-super-vl:free`, `google/gemma-4-31b-it:free`,
`openrouter/free` (enruta a uno aleatorio).

---

## 3. Estructura actual del proyecto

```
guardiavirtual/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts            # ✅ Endpoint de extracción de antecedentes (con IA)
│   ├── components/
│   │   ├── chat.tsx                # ✅ UI del chat + acumulación de antecedentes
│   │   └── LoginForm.tsx           # ⚠️ Login visual (sin autenticación real)
│   ├── dashboard/
│   │   └── page.tsx                # ⚠️ Dashboard con datos hardcodeados
│   ├── globals.css
│   ├── layout.tsx                  # ⚠️ metadata por defecto ("Create Next App")
│   └── page.tsx                    # ✅ Página de login
├── public/                         # SVGs por defecto
├── AGENTS.md                       # Reglas del agente Next.js
├── CLAUDE.md                       # @AGENTS.md
├── prompt.md                       # ⚠️ Prompt de análisis (NO se usa en el código actual)
├── AVANCE.md                       # ← Este archivo
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

## 4. Estado de cada pieza (revisión)

### ✅ Funciona / implementado

1. **Página de login** (`app/page.tsx`) — diseño completo y responsivo.
2. **Formulario de login** (`app/components/LoginForm.tsx`) — valida que ID y contraseña no estén vacíos y muestra mensajes. *Sin autenticación real todavía.*
3. **Chat** (`app/components/chat.tsx`) — UI funcional: envía mensajes, muestra historial, scroll automático, estado "PROCESANDO...".
4. **API de chat** (`app/api/chat/route.ts`) — extrae y acumula antecedentes estructurados usando un LLM:
   - Devuelve JSON: `respuesta`, `tipoProcedimiento`, `especie`, `lugar`, `fecha`, `descripcionHechos`, `contradicciones`, `puedeConfeccionarBorrador`, `faltantes`.
   - Acumula antecedentes entre mensajes (el servidor recibe el estado previo).
   - Normaliza valores vacíos (`pendiente`, `null`, `sin información`) a `null`.
   - Determina si se puede confeccionar borrador (faltan campos mínimos).
5. **Dashboard básico** (`app/dashboard/page.tsx`) — layout con panel lateral y el chat.

### ⚠️ Implementado pero con deuda / incompleto

| Pieza | Problema |
|-------|----------|
| `prompt.md` | Está **desconectado** del código. `route.ts` usa un `systemPrompt` **inline** propio. Hay dos fuentes de verdad. |
| `LoginForm.tsx` | No autentica; solo valida campos. No hay sesión, ni redirección al dashboard. |
| `dashboard/page.tsx` | Datos del funcionario y agentes **hardcodeados**. El dashboard es accesible sin login. |
| `layout.tsx` | `metadata` sigue siendo "Create Next App". |
| `chat.tsx` | El tipo `Antecedentes` marca `tipoProcedimiento: string`, pero la API puede devolver `null` (mismatch de tipos). Envía campos extra (`puedeConfeccionarBorrador`, `faltantes`) al backend innecesariamente. |
| Sin `.env` / `.env.example` | Las claves de API no están documentadas. Sin `OPENROUTER_API_KEY` la API responde 500. |
| Estilos | `hover:bg-[#721212]` (rojo oscuro) en botones azules — probablemente error de color. Todas las burbujas usan el mismo azul sin diferenciar autor visualmente. |
| `LayoutProps<"/">` | Tipo de Next 16; conviene verificar en `node_modules/next/dist/docs/` (AGENTS.md) tras instalar dependencias. |

### ❌ Pendiente (lo que falta para el objetivo)

1. **Generación del borrador del parte policial** — el **núcleo del producto** no existe. Hoy solo se extraen antecedentes y se dice si *se puede* redactar. Falta el endpoint y la UI que redactan el documento.
2. **Autenticación real** y protección de rutas.
3. **Persistencia** (base de datos): los antecedentes se pierden al recargar.
4. **Gestión de casos** (crear, listar, reabrir, historial).
5. **Revisión y exportación** del borrador (imprimir / PDF / copiar / descargar).
6. **Validación de formato de fecha** (`dd/mm/yyyy`) y de datos obligatorios.
7. **Manejo de errores** en UI (clave faltante, rate limit, timeout del LLM).
8. **Tests** y despliegue.

---

## 5. Hallazgos / riesgos técnicos

- **Doble prompt:** unificar `prompt.md` y el `systemPrompt` de `route.ts` en **una sola fuente** (ideal: cargar `prompt.md` o moverlo a `lib/prompts.ts`).
- **Prompt actual pide `null`, pero `prompt.md` pide `"pendiente"`.** `route.ts` los normaliza; conviene alinear el prompt con el formato real (`null`) para evitar ambigüedad.
- **Alucinación:** el prompt prohíbe inventar datos (correcto), pero falta validación estricta de salida del modelo (esquema/Zod) y una revisión humana obligatoria antes de "finalizar".
- **Seguridad:** la API key vive en variables de entorno del servidor (correcto). Nunca debe ir al cliente. Revisar que no se filtren claves en logs.
- **Costos LLM:** `temperature: 0` y `response_format: json_object` son buenas prácticas. Considerar caché y límites de tokens.
- **Estado en cliente:** `datosAntecedentes` se mantiene solo en memoria. Sin backend de casos no hay recuperación.

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

### Fase 7 — Calidad, seguridad y despliegue
- [ ] Manejo de errores y estados de carga en toda la UI.
- [ ] Protección de endpoints, rate limiting y validación de entrada.
- [ ] Tests (extracción, validación de borrador, auth).
- [ ] Despliegue en Vercel + base de datos.
- [ ] Variables de entorno en producción.

### Fase 8 — Plantillas de parte (DIFERIDA, pendiente de_definition)
> Decisión del usuario: **aplazar**. El usuario aportará más adelante la
> plantilla real de los partes que usa Carabineros, para que la IA la rellene
> en vez de usar la estructura fija de 4 secciones.

- [ ] Recibir el documento modelo de la unidad (formato del parte).
- [ ] Modelar la plantilla como secciones ordenadas + encabezado fijo
      (Unidad, fecha, hora, funcionario, tipo de procedimiento).
- [ ] Sección **"Declaración de hechos"** con el estilo que defina el usuario
      (primera persona como el relato del afectado, o tercera persona
      objetiva del funcionario).
- [ ] La IA rellena cada sección solo con los antecedentes; `[PENDIENTE]` en lo que falte.
- [ ] Base actual a reemplazar: `SECCIONES_PARTE` en `lib/plantillas.ts`.

---

## 7. Dónde quedamos (resumen para retomar)

- **Fases 0, 1, 2, 3, 4, 5 y 6 completadas.** El sistema, con IA real
  (OpenRouter, modelo gratuito), extrae antecedentes, redacta el borrador del
  parte con secciones editables, exige revisión humana, **guarda los casos y
  borradores en base de datos** (SQLite + Prisma) y ofrece historial con
  filtros, búsqueda y borrado.
- **Detecta procedimientos mezclados**: si el funcionario narra un caso
  distinto al ya conversado, la IA lo señala como contradicción, **el borrador
  queda bloqueado** y el funcionario puede resolverlo con un clic ("Continuar
  con este caso") o abrir un caso nuevo. El caso nuevo **no hereda** datos del
  anterior.
- **Autenticación real** con sesión firmada, `proxy.ts` + validación por
  endpoint, y credenciales solo en `.env.local`.
- **UI en paleta de verde olivo** con burbujas diferenciadas (funcionario /
  asistente).
- **Fase 8 diferida:** el usuario aportará la plantilla real de los partes de
  Carabineros para que la IA la rellene.

### Próximos pasos inmediatos (sugeridos)
1. **Fase 7:** calidad, seguridad y despliegue (migrar SQLite → Postgres para Vercel, rate limiting, tests).
2. **Fase 8 (cuando el usuario entregue la plantilla real de los partes):** la IA rellenará ese formato, incluida la sección "Declaración de hechos".
3. Probar más escenarios adversarios en el chat (correcciones, contradicciones, cambio de procedimiento).

### Configuración local (qué se debe completar en `.env.local`)

| Variable | Estado | Notas |
|----------|--------|-------|
| `AI_BASE_URL` | ✅ definido | OpenRouter |
| `AI_API_KEY` | ✅ definido | Clave de OpenRouter: `sk-or-v1-20...b7753` (huella; la clave completa vive solo en `.env.local`) |
| `AI_MODEL` | ✅ definido | `minimax/minimax-m3.1-flash:free` |
| `SESSION_SECRET` | ✅ definido | Generado aleatoriamente |
| `USUARIOS_JSON` | ✅ definido | ID `daniel` |

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
| Avisos `LF will be replaced by CRLF` | `core.autocrlf` de Windows | Normalizado con `.gitattributes` (`eol=lf`) |

> **Antes de una instalación:** detener siempre el dev server. En Windows deja
> bloqueados los módulos nativos de `node_modules`.

## 9. Convenciones de trabajo

- Documentar en **español**.
- **Usar español neutro** en toda la interfaz, la documentación y los prompts:
  sin voseo (vos, podés, contame, revisá) ni modismos regionales (aquí, che,
  laburo). El texto puede terminar en un documento oficial. Esta regla también
  se le indica al modelo de IA en `lib/prompts.ts`.
- Actualizar este `AVANCE.md` al final de cada sesión (marcar casillas y anotar bloqueos).
- Mantener la regla de `AGENTS.md`: leer las docs de Next en `node_modules/next/dist/docs/` antes de escribir código nuevo.
- No inventar datos en los partes: es requisito del dominio policial.
