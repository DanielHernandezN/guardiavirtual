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
| IA / LLM | **OpenRouter** (fallback a OpenAI) | Endpoint `https://openrouter.ai/api/v1/chat/completions`. Modelo por defecto `openai/gpt-4o-mini`. |
| Estilo de API | **Rutas API de Next.js** (`app/api/...`) | |
| Despliegue objetivo | **Vercel** (sugerido) | Aún no configurado. |

> ⚠️ `node_modules` **no está instalado** en el workspace actual. Antes de compilar: `npm install`.

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

### Fase 1 — Unificar el "cerebro" (prompts)
- [ ] Elegir **una sola fuente** para los prompts (`lib/prompts.ts` recomendado).
- [ ] Unificar formato de salida: `null` vs `"pendiente"` (alinear `prompt.md`).
- [ ] Definir y documentar la estructura de datos del parte (tipos, especies, lugares, campos obligatorios).
- [ ] (Opcional) Validar la salida del modelo con un esquema (Zod).

### Fase 2 — Extracción de antecedentes (ya iniciada)
- [x] Endpoint `/api/chat` con IA.
- [x] UI de chat con acumulación.
- [ ] Validar `fecha` en formato `dd/mm/yyyy`.
- [ ] Mejorar manejo de `contradicciones` y presentarlas en la UI.
- [ ] Corregir tipos en `chat.tsx` (aceptar `null`) y limpiar payload.

### Fase 3 — Núcleo: generación del borrador del parte policial
- [ ] Nuevo endpoint `/api/borrador` (solo cuando `puedeConfeccionarBorrador === true`).
- [ ] Prompt de redacción con estructura formal del parte (encabezado, antecedentes, hechos, especies, conclusiones).
- [ ] Plantilla según `tipoProcedimiento` (hurto, robo, accidente, etc.).
- [ ] Regla estricta: **no rellenar datos faltantes con invención**; dejar `[PENDIENTE]` o vacío.
- [ ] UI para ver el borrador, editar y confirmar.
- [ ] Revisión humana obligatoria antes de dar por finalizado.

### Fase 4 — Autenticación y sesiones
- [ ] Autenticación real (credenciales institucionales o identidad del funcionario).
- [ ] Middleware/layout de protección: `/dashboard` requiere sesión.
- [ ] Redirección login → dashboard.
- [ ] Cierre de sesión.

### Fase 5 — Persistencia y gestión de casos
- [ ] Elegir base de datos (Supabase/Postgres + Prisma recomendado; SQLite como MVP local).
- [ ] Modelos: `Usuario`, `Caso`, `Antecedentes`, `Borrador`, `Historial`.
- [ ] CRUD de casos; persistir antecedentes y borradores.
- [ ] Listado e historial de casos en el dashboard.
- [ ] Reabrir caso y continuar.

### Fase 6 — UI/UX del dashboard
- [ ] Panel lateral con datos reales del funcionario.
- [ ] Sección de casos (activos / históricos).
- [ ] Vista de borrador con indicadores de completitud.
- [ ] Diferenciar visualmente mensajes funcionario vs. asistente.

### Fase 7 — Calidad, seguridad y despliegue
- [ ] Manejo de errores y estados de carga en toda la UI.
- [ ] Protección de endpoints, rate limiting y validación de entrada.
- [ ] Tests (extracción, validación de borrador, auth).
- [ ] Despliegue en Vercel + base de datos.
- [ ] Variables de entorno en producción.

---

## 7. Dónde quedamos (resumen para retomar)

- **Fase 0 completada y verificada** (entorno, `.env.example`, metadata, tokens de marca, typegen/lint/build en verde).
- El **chat y la extracción de antecedentes con IA funcionan** y están conectados a OpenRouter.
- El **dashboard y el login son visuales**, sin autenticación ni persistencia.
- **Lo más importante pendiente:** generar el **borrador del parte policial** (Fase 3). Es el corazón del proyecto.

### Próximos pasos inmediatos (sugeridos)
1. Configurar `OPENROUTER_API_KEY` en `.env.local` (a partir del nuevo `.env.example`) y probar el chat de extremo a extremo.
2. **Fase 1:** unificar los prompts en `lib/prompts.ts` (hoy `prompt.md` y `route.ts` se contradicen con `null` vs `"pendiente"`).
3. Corregir deudas rápidas pendientes: tipos en `chat.tsx` (`string` vs `null`) y diferenciar visualmente los mensajes por autor.
4. Empezar la **Fase 3** (endpoint + UI del borrador), que es el objetivo central.

---

## 8. Convenciones de trabajo

- Documentar en **español**.
- Actualizar este `AVANCE.md` al final de cada sesión (marcar casillas y anotar bloqueos).
- Mantener la regla de `AGENTS.md`: leer las docs de Next en `node_modules/next/dist/docs/` antes de escribir código nuevo.
- No inventar datos en los partes: es requisito del dominio policial.
