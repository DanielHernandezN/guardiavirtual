# Guardia Virtual — Presentación

Asistente de apoyo documental para funcionarios de guardia: convierte el relato
o el acta de aprehensión en un **borrador de parte policial** con el formato de
la unidad, listo para revisar, confirmar y descargar en **Word**.

> Es un *asistente documental*: no reemplaza la decisión del funcionario ni la
> firma oficial. **Nunca inventa datos**: lo que no consta queda como
> `[PENDIENTE]` para revisión humana.

---

## El problema

Confeccionar un parte toma tiempo de guardia, exige formato formal y cualquier
error u omisión cuesta caro. El funcionario narra los hechos una vez y el
sistema hace el trabajo mecánico: estructurar, redactar y formatear.

## Cómo funciona (demo en 5 pasos)

1. El funcionario **narra la idea con sus palabras** en el chat (tipo de
   procedimiento, lugar, fecha, detenido, aprehensores, testigos, víctimas).
2. La IA **extrae los antecedentes** y confirma lo entendido; se puede pedir el
   borrador en cualquier momento.
3. **GENERAR BORRADOR** redacta el parte con las secciones de la plantilla
   (relato, lesiones, instrucciones del fiscal, firmas).
4. El funcionario **revisa, edita y confirma**; el caso queda guardado con
   historial, papelera y trazabilidad.
5. Descarga el **Word institucional** (Arial 11, interlineado 1,5, firmas y
   numeración de página).

Tiempos medidos con IA gratuita: extracción ~1,5 s, redacción ~17 s.

## Funcionalidades

- Chat en modo libre (estilo ChatGPT) con extracción estructurada de datos.
- Ingesta de actas **TXT, DOCX y PDF con texto** (máx. 10 MB, 40.000 caracteres).
- Validación de RUT, patentes, fechas, coherencia y contradicciones.
- Trazabilidad por campo: cada dato respaldado con su extracto literal.
- Roles **ADMIN / FUNCIONARIO**, panel de administración de usuarios.
- Historial con búsqueda, papelera, restauración y borrado definitivo.
- Interfaz responsive (celular, tablet y escritorio).
- 141 pruebas automatizadas; typecheck, lint y build en verde.

## Stack

| Capa | Tecnología |
|------|-----------|
| App | Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind v4 |
| IA | API compatible OpenAI (Groq por defecto; OpenAI, Gemini, Mistral, OpenRouter) |
| Datos | Prisma 6 + SQLite (local) / PostgreSQL Neon (producción) |
| Docs | `mammoth`, `unpdf`, `docx` |
| Auth | scrypt + sesión HMAC-SHA256 en cookie HttpOnly |
| Deploy | Vercel |

## Para venta o licenciamiento

- **Licencia por unidad**: instalación dedicada por comisaría con su base de
  datos y sus usuarios.
- **Suscripción mensual**: incluye hosting, actualizaciones y soporte.
- **Código fuente**: transferencia con capacitación y documentación
  (`README.md`, `DEPLOY.md`, `AVANCE.md`).

El proveedor de IA se cambia solo con variables de entorno, sin tocar código,
así que cada cliente puede usar su propia clave y controlar su costo
(~US$0,003 por parte con modelos de pago rápidos).

## Contacto

- Responsable: [Nombre]
- Email: [email]
- Teléfono: [teléfono]
- Demo: <https://guardiavirtual.vercel.app> (acceso con credenciales de prueba)

---

*Beta cerrada el 31/10/2026. Estado: funcional en producción, pendiente solo la
validación con un caso real completo.*
