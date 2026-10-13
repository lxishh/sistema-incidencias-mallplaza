# AGENTS.md — Sistema de Gestión y Trazabilidad de Incidencias (Mallplaza Copiapó)

## Qué es
Prototipo de sistema web para reportar fallas operativas, calcular una prioridad determinista y permitir que Jefatura gestione incidencias. La conexión con el sistema central (Casa Central) es parte de la arquitectura objetivo; el backend actual solo tiene un adaptador mock y no crea órdenes reales.

## Stack (no cambiar sin preguntar)
- Backend: Node.js 20 + Express, `pg` (sin ORM), `zod`, `bcrypt` (cost 12), `jsonwebtoken`, `multer`, `pino`.
- BD: PostgreSQL 15+ (Amazon RDS). Migraciones con `node-pg-migrate`.
- Frontend: PWA responsiva (Vite + `vite-plugin-pwa`), Chart.js para gráficos.
- Pruebas: Vitest + supertest. Lint: ESLint + Prettier.
- Infra: AWS Elastic Beanstalk + RDS + S3. Todo por HTTPS (TLS 1.2+).

## Contexto vigente y documentación
- Estado de cumplimiento y decisiones pendientes: `docs/entregables/Matriz_trazabilidad_RF_RNF.xlsx` y `docs/preguntas.md` (D1 a D12). No resolver una decisión pendiente por inferencia.

Antes de cambiar código, leer `docs/HANDOFF-ANTIGRAVITY.md` para el traspaso operativo y el estado de Git; luego seguir el orden obligatorio de documentación listado abajo.

Antes de cambiar código, leer `docs/estado-proyecto.md` para distinguir capacidades actuales de pendientes y `docs/justificacion-modelo-datos.md` para comprender el esquema. `docs/informe-proyecto.md` es el informe universitario consolidado; mantenerlo alineado con avances reales y nunca atribuir aprobaciones a Mallplaza que no estén documentadas.

## Estructura del repo
```
/backend   /frontend   /db/migrations   /docs
```
`db/schema.sql` es el modelo inicial implementado en el prototipo. Se elaboró en la fase de diseño con asistencia de IA; no se recibió como especificación oficial de Mallplaza ni consta validación de la empresa. Las migraciones deben reproducir la versión vigente. Antes de cambiarla, revisar `docs/justificacion-modelo-datos.md`, documentar razón/impacto y obtener aprobación del usuario. No describir el esquema como corporativamente aprobado.

## Reglas de negocio (obligatorias)
**Prioridad** (función pura en `backend/src/rules/prioridad.js`, primera condición que se cumple):
1. `impacto_operativo && ubicacion === 'ALTO_TRANSITO'` → `CRITICA`
2. `riesgo_accidente || afecta_terceros` → `ALTA`
3. `ubicacion === 'ALTO_TRANSITO' || impacto_operativo` → `MEDIA`
4. si no → `BAJA`

`tipo_falla` NO interviene en la prioridad, solo se almacena.

**Estados:** `PENDIENTE → EN_PROCESO → RESUELTA`, solo hacia adelante. Resuelta exige haber pasado por En proceso. La BD ya lo impone con un trigger; la API debe traducir ese error a HTTP 409.

**Formulario (todo obligatorio salvo comentario y fotos):** `rut_operario` (formato `12345678-5`, módulo 11), `ubicacion` (`ALTO_TRANSITO|TRANSITO_MEDIO|BAJO_TRANSITO`), `tipo_falla` (`ELECTRICA|SANITARIA_AGUA|ESTRUCTURAL|ESTETICA_CONFORT|MOBILIARIO`), `impacto_operativo`, `riesgo_accidente`, `afecta_terceros` (booleanos), `comentario` (≤1000), fotos 0 a 3 (≤2 MB, jpeg/png/webp).

**KPIs** (minutos, rango de fechas sobre `fecha_creacion`, con los días interpretados en la zona `America/Santiago`):
- MTTR = promedio de `fecha_cierre - fecha_creacion` de incidencias `RESUELTA`.
- % SLA = resueltas con tiempo ≤ `sla_politica.resolucion_minutos` / resueltas × 100. SLA resolución: Crítica 240, Alta 480, Media 1440, Baja 4320 min.
- Además: abiertas fuera de plazo, conteos por prioridad, tipo_falla y ubicación, y conteo por `estado_sync`.

## API
Implementado en el backend actual: `GET /health` · `GET /api/catalogos` · `POST /api/incidencias` (público, JSON; aún no multipart) · `POST /api/auth/login|logout`, `GET /api/auth/me` · `GET /api/incidencias` · `GET /api/incidencias/:id` · `PATCH /api/incidencias/:id/estado` · `GET /api/dashboard/kpis` (endpoint recién incorporado; validar durante verificación integrada).

Diseño objetivo, todavía pendiente: `POST /api/incidencias` con carga de fotos y `POST /api/incidencias/:id/reenviar`.
Errores: `{ "error": { "code", "message", "details" } }`. Sesión Jefatura en cookie httpOnly + SameSite=Strict (JWT, configurable con SESSION_TTL_MINUTES, 30 min por defecto). Solo existe el rol Jefatura.

## Integración con Casa Central
El prototipo conserva la frontera `CasaCentralClient.crearOrdenTrabajo(incidencia)` con un mock local. `POST /api/incidencias` deja la incidencia en `PENDIENTE_SINC` y responde 201 sin enviar una orden real; no hay worker que consuma la cola ni intentos automáticos. La conexión institucional se configurará en la etapa de integración usando el contrato técnico aprobado. Credenciales solo en almacenes de secretos/variables de entorno; nunca inventar payloads.

## Seguridad y datos personales
- Nunca poner secretos, API keys ni tokens en el código, los logs ni `detalle_error`.
- El RUT es dato personal (Ley 21.719): no loguearlo ni exponerlo en respuestas públicas.
- Consultas SQL siempre parametrizadas. Validar toda entrada con `zod`.
- Rate limiting en login y en `POST /api/incidencias`.

## Convenciones
- Una rama por bloque de trabajo (por ejemplo `feature/S1-backend` para todo el Sprint 1), un commit por tarea con Conventional Commits y un PR contra `develop`.
- Toda lógica nueva lleva tests. El motor de reglas lleva test de tabla de verdad.
- Antes de dar una tarea por terminada: `npm run lint && npm test` en verde.
- No crear commits cuyo único fin sea registrar el hash de otro commit; actualizar `docs/estado-proyecto.md` en el mismo commit de la tarea.
- No versionar artefactos de build (`frontend/dist/`) ni binarios generados; el `.docx` del informe es una exportación del `.md`.

## Mantener el contexto al día
- Actualizar `docs/estado-proyecto.md` al completar una tarea: estado, fecha, pruebas, límites y siguiente paso.
- Actualizar `docs/informe-proyecto.md` solo con resultados demostrados o propuestas claramente etiquetadas; registrar decisiones y cambios de alcance.
- Si se corrige un documento detallado (API, diccionario, preguntas), revisar que el informe consolidado refleje el mismo estado.

## Requiere revisión/aprobación antes de cambiar
Cambiar la regla de prioridad, el stack o el formato del payload institucional. Cambiar `db/schema.sql` requiere análisis y justificación en `docs/justificacion-modelo-datos.md`, actualizar migración/pruebas y aprobación del usuario. El esquema actual es una propuesta técnica del prototipo, no especificación oficial de Mallplaza. Si algo es ambiguo, anótalo en `docs/preguntas.md` y continúa con un supuesto de prototipo, explícitamente marcado.
