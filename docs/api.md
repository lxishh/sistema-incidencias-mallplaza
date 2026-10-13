# API — Sprint 1

> **Estado:** contrato del backend verificado localmente al 9 de octubre. `POST /api/incidencias` acepta JSON; no hay multipart/fotos. `GET /api/dashboard/kpis` cuenta con pruebas automatizadas y validación manual con datos sintéticos. No existen worker real de sincronización ni endpoint `/api/incidencias/:id/reenviar`.

Todas las respuestas de error usan `{ "error": { "code": string, "message": string, "details": [{ "field": string, "issue": string }] } }`. `details` es `[]` si no aplica. Los errores de validación son HTTP 400 (`VALIDATION_ERROR`); el rate limit responde HTTP 429 (`RATE_LIMITED`).

## `GET /health`
Público. Devuelve `200 { "status": "ok" }`.

## `GET /api/catalogos`
Público. Devuelve `ubicaciones` y `tipos_falla` con los valores admitidos por el esquema.

## `POST /api/incidencias`
Público, JSON. Rate limit de 60 solicitudes por IP (ventana de 15 minutos, configurable). Recibe `rut_operario`, `ubicacion`, `tipo_falla`, `impacto_operativo`, `riesgo_accidente`, `afecta_terceros` y opcionalmente `comentario`. Valida módulo 11 y los catálogos; calcula la prioridad y encola con estado de sync `PENDIENTE_SINC`. No espera a Casa Central.

Responde `201 { id, prioridad, estado, estado_sync, fecha_creacion }`.

## `POST /api/auth/login`
Público, JSON `{ "email", "password" }`. Rate limit por IP de 10 intentos por ventana de 15 minutos (configurable). En éxito responde `200 { id, nombre, email, rol }` y establece una cookie JWT `httpOnly`, `SameSite=Strict`, configurable con `SESSION_TTL_MINUTES` (30 minutos por defecto); en producción también `Secure`. Credenciales incorrectas o usuario inactivo responden `401` con `Credenciales inválidas`.

## `POST /api/auth/logout`
Público. Elimina la cookie de sesión y responde `204`.

## `GET /api/auth/me`
Requiere sesión Jefatura. Responde `{ id, nombre, email, rol }`.

## `GET /api/incidencias`
Requiere sesión Jefatura. Filtros opcionales: `estado`, `prioridad`, `ubicacion`, `tipo_falla`, `q` (ID exacto), `desde`, `hasta`, `page` y `limit`. Las fechas son `YYYY-MM-DD` en `REPORT_TZ` (por defecto `America/Santiago`); `hasta` incluye el día completo. `page` por defecto 1; `limit` por defecto 20, máximo 100.

Responde `{ data, page, limit, total }`. La lista no incluye el RUT. Ordena por prioridad y fecha de creación ascendente.

## `GET /api/incidencias/:id`
Requiere sesión Jefatura. Devuelve todos los campos de la incidencia salvo `intentos_sync` y `proximo_reintento`; incluye el RUT, `sync: { estado, id_externo_mallplaza, intentos }`, `historial` con nombre de usuario o `null`, y `evidencias` (vacío en este Sprint). Responde `404 NOT_FOUND` si no existe.

## `PATCH /api/incidencias/:id/estado`
Requiere sesión Jefatura. JSON `{ "estado": "EN_PROCESO" | "RESUELTA" }`. Solo permite `PENDIENTE → EN_PROCESO → RESUELTA`; transición inválida devuelve `409 INVALID_TRANSITION`. Incidencia inexistente devuelve `404 NOT_FOUND`.

## `GET /api/dashboard/kpis`
Requiere sesión Jefatura. Acepta `desde` y `hasta` opcionales en formato `YYYY-MM-DD`; ambas fechas son inclusivas y se interpretan en `REPORT_TZ` (por defecto `America/Santiago`). Si no se informan fechas, se considera todo el historial.

Devuelve conteo total, abiertas, resueltas, abiertas fuera de SLA, MTTR promedio en minutos, cumplimiento SLA de resolución en porcentaje y distribuciones por prioridad, tipo de falla, ubicación y estado de sincronización. MTTR y cumplimiento SLA usan la cohorte de incidencias creadas dentro del período. Cuando no hay incidencias resueltas, MTTR y porcentaje SLA se devuelven como `null`, no como cero. Los objetivos se consultan desde `sla_politica`.

La ruta requiere autenticación. Al 9 de octubre de 2026, lint y 33 pruebas automatizadas pasan; la consulta también se cotejó con datos sintéticos temporales en PostgreSQL. Los resultados de esa validación no son datos operacionales de Mallplaza.

## Capacidades de siguientes sprints

- **Fotos:** implementar `multipart/form-data` con 0–3 imágenes, 2 MB cada una, JPEG/PNG/WebP y almacenamiento privado S3. Aunque el esquema ya contiene metadatos, el endpoint todavía no guarda archivos.
- **Casa Central:** el alta deja `estado_sync = PENDIENTE_SINC`. La interfaz mock no se invoca como integración productiva; en la etapa de integración se conectará el worker y se configurará el conector con la especificación institucional correspondiente.
- **Dashboard:** endpoint y vista inicial local implementados y verificados con pruebas automatizadas, datos sintéticos temporales y revisión en navegador.
- **PWA:** el formulario y panel local existen; QR de demostración y carga de fotos quedan pendientes.

