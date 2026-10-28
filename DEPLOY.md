# Despliegue — Guardia Virtual (Cabo Virtual)

Guía para publicar la aplicación en **Vercel** con **PostgreSQL**.

> En desarrollo la aplicación usa **SQLite** (archivo local `prisma/dev.db`),
> sin necesidad de infraestructura. En Vercel el sistema de archivos es de
> solo lectura, así que la base de datos debe ser **PostgreSQL** (Vercel
> Postgres, Neon, Supabase, Railway, etc.).

---

## 1. Base de datos

1. Crear una base de datos PostgreSQL y obtener la URL de conexión:

   ```
   postgresql://usuario:clave@host:5432/guardiavirtual?sslmode=require
   ```

   **Opción recomendada:** en Vercel → **Storage / Marketplace → Neon**, crear
   la base y conectarla al proyecto. Neon entrega dos cadenas:

   - `DATABASE_URL` — conexión **pooled** (la usa la aplicación en Vercel).
   - `DATABASE_URL_UNPOOLED` — conexión **directa** (la usa `prisma db push`
     durante la compilación, porque el DDL no funciona bien con el pooler).

   Si tu proveedor solo entrega una URL, usa la misma en ambas variables.

2. Preparar el esquema de Prisma para PostgreSQL:

   ```powershell
   npm run db:use:postgres
   ```

   El script reescribe el `provider` de `prisma/schema.prisma`. Para volver
   a SQLite: `npm run db:use:sqlite`.

3. Sincronizar el esquema con la base de datos:

   ```powershell
   $env:DATABASE_URL = "postgresql://..."
   npx prisma db push --skip-generate
   npx prisma generate
   ```

   > El historial de migraciones de `prisma/migrations` está escrito en SQL de
   > SQLite. Para PostgreSQL se usa `prisma db push`, que es idempotente.
   > Si más adelante se adoptan migraciones en producción, hay que generar
   > las de PostgreSQL con `prisma migrate dev` sobre una base de datos
   > Postgres y versionarlas por separado.

---

## 2. Variables de entorno

En **Vercel → Project → Settings → Environment Variables**, definir:

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `AI_BASE_URL` | no | Endpoint del proveedor (por defecto OpenRouter). |
| `AI_API_KEY` | **sí** | Clave del proveedor de IA. |
| `AI_MODEL` | no | Modelo de extracción (por defecto `poolside/laguna-s-2.1:free`). |
| `AI_MODEL_REDACCION` | no | Modelo para redactar el borrador. Si falta, usa `AI_MODEL`. |
| `UNIDAD_NOMBRE` | no | Nombre de la unidad que aparece en el encabezado del parte. Si falta, se escribe `[PENDIENTE]`. |
| `SESSION_SECRET` | **sí** | Secreto de firma de la sesión (HMAC-SHA256). Sin él, el sistema queda **inaccesible** en producción (fallo cerrado). |
| `USUARIOS_JSON` | **sí** | Lista de funcionarios: `[{"id":"...","nombre":"...","grado":"...","password":"..."}]`. `grado` es opcional. Sin ella, nadie puede autenticarse. |
| `DATABASE_URL` | **sí** | URL de PostgreSQL (**pooled** en Neon/Vercel). |
| `DATABASE_URL_UNPOOLED` | recomendada | URL directa para `prisma db push` durante la compilación. Si falta, se usa `DATABASE_URL`. |

Generar un `SESSION_SECRET` seguro:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> `SESSION_SECRET` y `USUARIOS_JSON` **no** pueden tener valores por defecto:
> son los dos controles de acceso del sistema.

> **Acentos y eñes en las variables:** el valor debe llegar como UTF-8. Una
> variable guardada con la página de códigos de Windows puede dejar el nombre
> como `Hern??ndez` (la tilde se pierde y no se puede recuperar). Para
> cargarla sin riesgo, escribe el valor en un archivo UTF-8 **sin BOM** y usa
> `npx vercel env add USUARIOS_JSON production < valor.txt`, o pégalo en el
> dashboard de Vercel. Las variables de tipo *Sensitive* no se pueden volver a
> leer desde la CLI: si se corrompen, hay que reescribirlas. Al iniciar sesión,
> la aplicación avisa por consola (`[auth] El nombre del funcionario …`) si
> detecta nombres con `?` o el carácter U+FFFD.

---

## 3. Despliegue

### Opción A — Vercel CLI

```powershell
npx vercel login          # abre el flujo de dispositivo en el navegador
npx vercel link           # vincula la carpeta con el proyecto (o lo crea)
npx vercel env add ...    # una vez por variable (ver sección 2)
npx vercel --prod         # compila y publica
```

Las variables se pueden cargar de una vez desde `.env.local` sin exponerlas en
la terminal:

```powershell
npx vercel env add AI_API_KEY production < valor.txt
```

> No subas `.env.local` al repositorio ni pegues secretos en la conversación.

### Opción B — Repositorio de GitHub

1. Subir el código a GitHub y conectar el repositorio en Vercel.
2. Vercel usa el framework detectado (`nextjs`). El `vercel.json` del
   repositorio define el comando de compilación:

   ```bash
   npm run db:use:postgres && DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" prisma db push --skip-generate && prisma generate && next build
   ```

3. Variables de entorno configuradas en **Production, Preview y Development**
   (o solo en Production, según la política de la unidad).
4. Desplegar. El script `postinstall` (`prisma generate`) ya regenera el
   cliente de Prisma en cada instalación.

> `vercel.json` debe ser **JSON puro**: no admite comentarios `#`. La
> explicación va en este documento, no en el archivo.

---

## 4. Verificación posterior

- `GET /` → 200 (pantalla de acceso).
- `POST /api/auth/login` con credenciales válidas → 200 y cookie de sesión.
- `GET /dashboard` → 200 con sesión; 401/redirect sin sesión.
- Crear un caso desde el chat y confirmar un borrador: debe aparecer en el
  historial (comprueba que la escritura en PostgreSQL funciona).

---

## 5. Limitaciones conocidas en este despliegue

- **Rate limiting en memoria** (`lib/limites.ts`): cada instancia de Vercel
  lleva su propio contador. Para un límite global hay que usar un almacén
  compartido (Redis, Upstash). El límite por funcionario funciona mientras
  el usuarioPegue a la misma instancia, lo cual no está garantizado.
- **Sesión sin estado** (cookie firmada): no requiere servidor de sesiones,
  por lo que escala bien en varias instancias.
- **Cifrado de contraseñas** con `scrypt`: el hash se regenera en cada
  arranque porque `USUARIOS_JSON` guarda la contraseña en claro. Si se
  migra el usuario a la base de datos, el hash debe persistir.
