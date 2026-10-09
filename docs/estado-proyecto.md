# Estado vivo del proyecto — contexto para desarrollo

**Última actualización:** 9 de octubre de 2026  
**Fecha académica objetivo:** 14 de octubre de 2026  
**Uso:** lectura rápida obligatoria para cualquier persona o agente que retome programación. El informe académico consolidado está en `docs/informe-proyecto.md`.

## 1. Descripción breve

Prototipo local para reportar fallas operativas de Mallplaza Copiapó, calcular prioridad sin discreción del usuario y permitir a Jefatura seguir los estados. El sistema está pensado para interoperar con Casa Central, pero hoy la conexión es un mock.

## 2. Origen y nivel de validación de los requisitos

- El encargo de proyecto y `AGENTS.md` reúnen alcance y reglas de esta implementación.
- `db/schema.sql` fue producido como borrador inicial con apoyo de IA durante el diseño. **No es un archivo entregado por Mallplaza ni se debe presentar como modelo aprobado por la empresa.**
- El usuario pide comprender el modelo, justificarlo y poder revisarlo frente a preguntas del profesor. La documentación de datos explica cada tabla/regla y señala decisiones que requieren revisión del equipo.
- El modelo permanece como baseline del código existente hasta completar esa revisión. No cambiarlo a escondidas: proponer cambios con motivo, impacto, migración/pruebas y pedir aprobación antes de editar el esquema.
- Los informes deben exponer diseño/prototipo y avances demostrables sin afirmar reuniones, aprobación, pruebas de usuario o integración productiva que no hayan ocurrido. La falta de respuesta de la empresa no es contenido para el relato principal. Mantener dependencias técnicas de manera profesional como alcance de la fase de integración.
- Si la institución exige declarar uso de IA, seguir su política académica. El usuario debe comprender y poder explicar el resultado, no memorizarlo ni atribuir validación inexistente.

## 3. Invariantes funcionales de la versión actual

1. Prioridad, en orden de primera regla coincidente: impacto operativo + `ALTO_TRANSITO` → `CRITICA`; riesgo o afecta a terceros → `ALTA`; ubicación alto tránsito o impacto → `MEDIA`; si no, `BAJA`. `tipo_falla` no participa.
2. Estados solo `PENDIENTE → EN_PROCESO → RESUELTA`; trigger DB protege integridad y API devuelve 409 en transición inválida.
3. RUT módulo 11 y categorías/valores de `AGENTS.md`. RUT no se registra en logs ni se entrega en respuesta pública.
4. Alta responde sin esperar a Casa Central y deja `PENDIENTE_SINC`.
5. PostgreSQL, stack y interfaces no se cambian sin revisar `AGENTS.md` y solicitar aprobación cuando corresponda.

## 4. Estado de producto

### Implementado en backend

- Node 20 / Express, configuración y pool `pg`, manejo de errores y logs estructurados con redacción.
- Login/logout/me de Jefatura, bcrypt, cookie JWT.
- Catálogos y POST público JSON para crear incidencia.
- Función de prioridad pura, validación Zod/RUT, filtro/listado/detalle, cambio de estado y consulta de historial.
- PostgreSQL por Docker Compose, esquema y migración equivalentes.
- Interfaz `CasaCentralClient` mock y helper de auditoría; no se ejecutan desde un worker.
- ESLint y Vitest/Supertest: lint aprobado y 27 pruebas aprobadas en 8 archivos, incluidos cálculos KPI y validación de rangos.

### Frontend implementado y verificado en entorno local

- Frontend con Vite y configuración PWA, formulario público JSON, login Jefatura, listado, filtros, detalle/historial y transición de estados.
- `npm ci` y `npm run build` ejecutados desde Ubuntu/WSL con Node 20; Vite produjo el bundle PWA, manifest, service worker y precache.
- Se revisó el panel en navegador contra PostgreSQL. El filtro de un día mostró tres incidencias y dos resueltas; el listado conserva su propio alcance de filtros.
- Los artefactos compilados no se versionan como resultado de esta tarea; el build es reproducible desde el código fuente.

### No implementado todavía

- QR de demostración.
- API multipart, escritura de fotos, almacenamiento local/S3.
- Worker/cola de sync, reintentos automáticos, reenvío manual y conexión externa.
- Despliegue AWS, cuentas/IAM/secrets productivos, alertas/observabilidad, HA/DR.
- Repo Git tiene remoto `origin` e identidad local configurada; el trabajo de esta iteración queda en `feature/S1-dashboard-kpis`, con commit local no publicado.
- El archivo de migración coincide con el identificador histórico `20261009000100-initial-schema`. `npm run db:migrate` informa que no hay migraciones pendientes; muestra una advertencia de timestamp no reconocible por el separador legado con guion, sin aplicar cambios.
- bcrypt se actualizó a 6.0.0; compatibilidad validada con Node 20 por pruebas de login y sesión. `npm audit --omit=dev` reporta cero vulnerabilidades productivas. El audit completo todavía reporta 5 hallazgos en dependencias de desarrollo.

## 5. Siguiente objetivo corto

Al 14 de octubre se prioriza un prototipo local reproducible: interfaz de reporte, gestión Jefatura, datos PostgreSQL y KPI principales. Si el tiempo se reduce, diferir fotos y mock visual antes que debilitar alta/prioridad/estados/gestión/KPI. No hacer deploy a AWS ni afirmar integración real para cumplir la fecha.

## 6. Protocolo de actualización

Al cerrar cada tarea, actualizar en este archivo:

```text
### Registro de avance — AAAA-MM-DD
- Tarea completada:
- Archivos/capacidades:
- Verificación y resultado:
- Decisiones cambiadas (si las hay):
- Riesgos/bloqueos actuales:
- Próxima tarea:
```

Actualizar también `docs/informe-proyecto.md` con lo que haya quedado demostrado, y los anexos temáticos relacionados. Mantener este archivo corto: una captura del estado actual, no una bitácora duplicada.

## 7. Git y configuración local

El workspace usa Git desde Ubuntu/WSL para evitar problemas con la ruta UNC. El remoto `origin` y la identidad local están configurados. La iteración se guarda en `feature/S1-dashboard-kpis`; no se ha publicado ni se declara PR creado.

Las variables locales de prueba están excluidas con `.gitignore`. En un clon limpio, crear `backend/.env.test` a partir de `backend/.env.test.example`; versionar únicamente el archivo de ejemplo, nunca un `.env` con credenciales reales.

## Registro de avance — 2026-10-09

- Tarea completada: backend base y documentación inicial; elaborado informe consolidado con procesos, UML, tecnologías, datos, KPI/SLA, calidad y operación.
- Verificación backend: lint y 27 pruebas aprobadas; la migración ya constaba aplicada en PostgreSQL local.
- Revisión completada: `schema.sql` está identificado como borrador creado con ayuda de IA; `docs/justificacion-modelo-datos.md` explica su diseño y limitaciones. El informe presenta el modelo como propuesta del prototipo y no como especificación corporativa aprobada.
- Riesgo/bloqueo: Git ya está inicializado, pero está vacío y no tiene remoto. WSL devuelve `E_ACCESSDENIED` desde esta sesión y Docker deniega acceso a su API; Node/npm deben usarse desde una terminal Ubuntu nativa y el daemon debe estar accesible a esa distribución.
- Próxima tarea recomendada: desde Ubuntu ejecutar `npm ci` en frontend y compilar PWA; verificar KPI con PostgreSQL y datos controlados; inspeccionar UI en navegador; luego preparar commit en WSL.

## Registro de avance — 2026-10-09 (continuación)

- Tarea completada: formulario público, panel Jefatura y vista KPI conectados a las rutas implementadas; el formulario valida campos obligatorios incluidos los grupos Sí/No, y el detalle permite cierre con botón/fondo.
- Archivos/capacidades: `frontend/src/main.js`, `frontend/src/styles.css`, `frontend/vite.config.js`, `frontend/README.md`, scripts raíz para desarrollo/build; endpoint autenticado `GET /api/dashboard/kpis` agregado en `backend/src/routes/dashboard.js` y montado en `backend/src/app.js`.
- KPI cubiertos por endpoint y panel: total, abiertas, resueltas, vencidas, MTTR, cumplimiento SLA y distribuciones por prioridad, falla, ubicación y estado de sync, con filtro inclusivo por fecha local.
- Verificación: `node --check` aprobó los JavaScript modificados y `node backend/scripts/lint.js` terminó con código 0. Los artefactos `frontend/dist` existentes son de una compilación previa; el build actual y los flujos integrados siguen pendientes. No se ejecutaron pruebas automatizadas en esta continuación.
- Decisiones: conservar `frontend/package-lock.json`, limpiar e instalar solo desde Ubuntu; no eliminar lockfile salvo error de sincronización de `npm ci`.
- Riesgos/bloqueos de ese momento: WSL/Docker inaccesibles a la sesión; resueltos al habilitar ejecución desde Ubuntu para la siguiente tarea.
- Próxima tarea: validar el build PWA y los KPI contra datos controlados.

## Registro de avance — 2026-10-09 (validación PWA y KPI)

- Tarea completada: compilación PWA, revisión visual del panel y validación del endpoint KPI con base temporal aislada.
- Verificación: `npm ci` + `npm run build` en frontend; `npm run lint` y `npm test` en backend (27 pruebas / 8 archivos). Casos KPI probaron MTTR, SLA, abiertas vencidas, conteos categorizados, autorización, rangos inválidos y denominadores vacíos. Con datos sintéticos, el API dio 4 incidencias, 2 resueltas, 2 abiertas, 1 vencida, MTTR 0,9 min y SLA 100%; el filtro del 9 de octubre mostró 3 incidencias, 2 resueltas, MTTR 0,9 min y SLA 100%. La base temporal se eliminó; `mallplaza_dev` se conservó.
- Verificación adicional: con el API aislado en una copia temporal de `mallplaza_dev`, el alta devolvió HTTP 201, prioridad `CRITICA`, estado `PENDIENTE` y `PENDIENTE_SINC`; la respuesta no expuso el RUT. La copia se eliminó al terminar.
- Hallazgos abiertos: advertencia informativa por formato legado del timestamp de migración; cinco hallazgos en dependencias de desarrollo pendientes de triage. No hay vulnerabilidades en dependencias de producción según `npm audit --omit=dev`.
- Próxima tarea: revisar visualmente envío, detalle y transición desde la interfaz; preparar instrucciones de demo con datos ficticios y decidir triage de dependencias de desarrollo.
