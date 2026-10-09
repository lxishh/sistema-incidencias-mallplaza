# Bitácora técnica — Sprint 1

## 1. Objetivo

Entregar una primera base ejecutable del sistema de incidencias operativas de Mallplaza Copiapó. El alcance se concentra en la API y la persistencia, usando el modelo inicial del prototipo registrado en `db/schema.sql` como baseline de implementación. No se alteró la regla de negocio de prioridad ni se fingió una conexión con Casa Central.

## 2. Qué quedó implementado

| Área | Resultado | Motivo |
|---|---|---|
| API Express | `GET /health`, catálogos, alta, autenticación y endpoints de consulta/estado | Permite validar temprano contrato HTTP, errores y reglas antes de construir la PWA. |
| Validación | Zod valida cuerpos y filtros; RUT chileno módulo 11 | Rechaza datos inválidos en el borde y entrega errores consistentes. La BD mantiene restricciones como segunda defensa. |
| Prioridad | Función pura en `backend/src/rules/prioridad.js` | La misma entrada siempre produce la misma prioridad; `tipo_falla` queda almacenado y no participa. |
| Sesión | bcrypt cost 12, JWT de 8 h en cookie `httpOnly`, `SameSite=Strict`; `Secure` en producción | Evita guardar el token en el código de cliente y limita su exposición a JavaScript. |
| Persistencia | PostgreSQL y migración inicial derivada literalmente de `db/schema.sql` | Mantiene una sola definición de datos y permite crear el esquema con una herramienta reproducible. |
| Transiciones | API limita cambios y trigger de PostgreSQL conserva la regla; conflicto traducido a HTTP 409 | La integridad se mantiene incluso si se modifica la BD por otra ruta. |
| Casa Central | Interfaz `crearOrdenTrabajo` con mock local y resultados simulables | Aísla el dominio y permite desarrollar el prototipo sin presentar una llamada mock como integración productiva. |
| Auditoría y logs | Tabla/helper de auditoría con resultados controlados para futuros intentos; redacción de RUT, credenciales, cookies y cabeceras | Prepara trazabilidad sin guardar secretos o datos personales en logs. El alta actual todavía no invoca Casa Central ni genera intentos reales. |
| Calidad | ESLint/Prettier y Vitest/Supertest, tabla de verdad y pruebas de integración | Automatiza revisión de reglas, validación, seguridad básica, DB y flujos HTTP. |
| Desarrollo local | Docker Compose con PostgreSQL 15 y base separada para pruebas | Reduce diferencias entre entornos y evita probar sobre la base de desarrollo. |

## 3. Archivos principales

- `backend/src/app.js`, `server.js`: ensamblaje HTTP y arranque del servicio.
- `backend/src/routes/auth.js`, `middleware/auth.js`: login/logout, sesión y autorización Jefatura.
- `backend/src/routes/incidencias.js`: catálogos, creación, filtros, detalle e iteración de estado.
- `backend/src/rules/prioridad.js`: función de prioridad.
- `backend/src/db.js`, `config.js`, `errors.js`, `logger.js`: pool, configuración, respuesta de errores y redacción.
- `backend/src/integrations/casaCentralClient.js`, `auditoriaApi.js`: frontera con el mock y registro de intentos.
- `db/schema.sql`: esquema de referencia; `db/migrations/20261009000100000_initial-schema.js`: migración equivalente.
- `backend/test/`: pruebas unitarias, integración, privacidad de logs y equivalencia de esquema.
- `docker-compose.yml`, `db/docker-init/01-create-test-db.sql`: entorno local y DB de pruebas.
- `docs/api.md`, `docs/preguntas.md`: contrato disponible y decisiones abiertas.

## 4. Decisiones y razones

### Se mantuvo consistente el modelo inicial

El borrador relacional actual define tipos, campos, restricciones, índices, historial, bitácora y SLA. La migración envuelve ese SQL para ejecutarlo mediante `node-pg-migrate`; la prueba `migration.test.js` compara el SQL normalizado de la migración con el modelo. La procedencia y justificación de sus elementos se explican en `docs/justificacion-modelo-datos.md`; no se atribuye aprobación empresarial a este esquema.

### La API no espera a Casa Central

El alta hace la escritura local y responde con `estado_sync = PENDIENTE_SINC`; la interfaz externa y su mock se mantienen aislados. Una cola/worker, estrategia de reintentos y configuración del conector institucional corresponden a una siguiente etapa, no son capacidades que deban presumirse en Sprint 1.

### La base también valida transiciones

La API ofrece un error 409 entendible para el cliente. El trigger de base de datos sigue siendo la barrera definitiva: impide saltarse `EN_PROCESO` aunque otra aplicación escriba directamente. La actualización se ejecuta en transacción con bloqueo de la incidencia para reducir carreras.

### Se limita información personal

El alta responde con ID, prioridad, estado y fecha; el RUT no aparece en la lista ni en logs. El detalle autenticado de Jefatura sí devuelve RUT porque así está documentado en el contrato actual; su necesidad, retención y visibilidad deben quedar aprobadas por el responsable de datos.

### Restricciones del checkout

El checkout proporcionado no tiene carpeta `.git`. Por eso no se pudo crear `feature/S1-backend`, commits ni PR. Los cambios se dejaron en el workspace. Para retomar el flujo grupal, primero debe integrarse el contenido a un repositorio Git compartido y seguir allí la política de ramas.

## 5. Verificación realizada

- `npm run lint`: ejecutado correctamente.
- `npm test`: **25 pruebas aprobadas en 8 archivos**, incluidas 8 pruebas de integración HTTP/PostgreSQL.
- `npm run db:migrate:test`: la migración se aplicó correctamente sobre `mallplaza_test`.
- PostgreSQL local quedó iniciado en Docker Desktop para el trabajo posterior.

Los comandos se verificaron desde una copia local del workspace porque el shell de Windows no ejecuta scripts npm desde una ruta UNC de WSL. La prueba usa el mismo código sincronizado del proyecto y PostgreSQL local.

## 6. Límites y siguientes entregas

No afirmar todavía que están disponibles: interfaz PWA/QR, carga multipart de 0–3 fotos, S3, consulta de KPI, dashboard, job de sincronización real, endpoint de reenvío, despliegue de producción, alertas/monitoreo, alta disponibilidad ni simulacro de DR. El esquema tiene parte de la estructura necesaria, pero el flujo y los servicios asociados deben implementarse y probarse.

## 7. Dependencias

La instalación reportó vulnerabilidades en dependencias transitivas/directas. No se aplicó `npm audit fix` automáticamente, porque puede actualizar versiones o introducir cambios incompatibles. El equipo debe revisar `npm audit` en una tarea separada, identificar paquetes afectados, priorizar por exposición y fijar versiones mediante PR.
