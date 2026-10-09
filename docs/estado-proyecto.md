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

### Verificación transversal

- La rama activa es `docs/S1-academic-closeout`, con remoto `origin` configurado. El informe y estado están comprometidos localmente; no se ha publicado ni abierto PR. Ramas visibles: `develop`, `feature/S1-dashboard-kpis`, `chore/S1-dev-dependency-audit` y esta rama documental. Ver `docs/HANDOFF-ANTIGRAVITY.md` antes de integrar ramas.
- El archivo de migración coincide con el identificador histórico `20261009000100-initial-schema`. Los comandos de migración terminan sin cambios; el runner muestra una advertencia de timestamp por el separador legado con guion.
- bcrypt 6.0.0, Vitest 4.1.11 y node-pg-migrate 8.0.4 se validaron en Node 20.20.2. `npm audit` completo reporta cero vulnerabilidades; lint y 27 pruebas pasan.

## 5. Siguiente objetivo corto

Al 14 de octubre se prioriza un prototipo local reproducible: interfaz de reporte, gestión Jefatura, datos PostgreSQL y KPI principales. Si el tiempo se reduce, diferir fotos y mock visual antes que debilitar alta/prioridad/estados/gestión/KPI. No hacer deploy a AWS ni afirmar integración real para cumplir la fecha.

## Próxima tarea activa

- Aceptación visual y audit de dependencias completados; build PWA, lint, 27 pruebas, migraciones locales y `npm audit` completo en verde.
- Pase final: repasar guion, conservar el caso sintético #2 existente y verificar instrucciones de arranque en el equipo de exposición.
- Logout: la prueba backend confirma HTTP 204, cookie vaciada y 401 posterior en `/api/auth/me`. En la demo, el navegador mostró `ERR_ABORTED`, pero al recargar pidió autenticación. Esto sugiere que la sesión sí se cerró; sin una traza de red no se atribuye una causa al evento.

## Cierre de brechas y documentación — 2026-10-09

- Tarea: corregir anexos que aún marcaban PWA/KPI como pendientes, incorporar explicación de ACID en el informe/justificación y construir un informe académico único en Word.
- Estado: PWA, KPI y audit de dependencias ya están descritos según las verificaciones previas; ACID ya está explicado. El informe Word consolidado se generó y se revisó visualmente tras exportarlo desde Word a PDF; el renderizador canónico `render_docx.py` no está disponible porque la runtime local no incluye LibreOffice.
- Pendiente de prototipo local: QR gráfico distribuible y carga de fotos. No se iniciaron porque la autorización para cambiar el stack requiere aprobación y no conviene inventar dependencias ni relajar controles de archivos.
- Pendiente externo/productivo: contrato/autenticación/sandbox de Casa Central, cuenta/budget/accesos AWS, dominio/IAM/secretos, política de datos y UAT con contraparte.
- Verificación de cierre: `git diff --check` pasó y las 27 páginas del Word se revisaron visualmente tras exportar con Word y renderizar con pypdfium2. `render_docx.py` no pudo usarse porque falta LibreOffice. No se reejecutaron pruebas de software: Node no está instalado en Ubuntu y el `npm` disponible invocó CMD de Windows desde una ruta UNC, terminando en `ENOENT` (buscó `C:\Windows\backend\package.json`). La suite previa registrada fue 27 pruebas aprobadas; para certificar la entrega hay que correr lint/tests/build con Node 20 nativo en Ubuntu.
- Cierre Git: informe y documentación comprometidos localmente en `b6812f0` y `de67d96`; `git status` limpio en `docs/S1-academic-closeout`. No se hizo push ni PR.
- Prioridad final: (1) repetir lint, 27 pruebas y build PWA en Ubuntu con Node 20; (2) ensayar la demo sin borrar datos; (3) completar QR gráfico si queda tiempo. No priorizar fotos, AWS ni Casa Central real antes de cerrar estas comprobaciones y conseguir aprobaciones/contratos.

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

El workspace usa Git desde Ubuntu/WSL para evitar problemas con la ruta UNC. El remoto `origin` y la identidad local están configurados. La rama activa para el cierre documental es `docs/S1-academic-closeout`; no se ha publicado ni se declara PR creado.

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

## Registro de avance — 2026-10-09 (guion de aceptación)

- Tarea completada: documentado el recorrido repetible del prototipo, datos sintéticos, resultados esperados, reglas de prioridad y criterios de aceptación.
- Límite: falta ejecutar la secuencia completa en navegador y conservar evidencia visual; las pruebas HTTP y automatizadas no se presentan como sustituto de aceptación UI.
- Próximo paso indicado al redactar la guía: repetir el guion en navegador; completado en el registro siguiente. Revisar los cinco hallazgos de dependencias de desarrollo.

## Registro de avance — 2026-10-09 (prueba visual de punta a punta)

- Tarea completada: aceptación visual local del alta, consulta de Jefatura, detalle, dos transiciones, cola, KPI y cierre de sesión.
- Evidencia: commit `61b48e4` en `feature/S1-dashboard-kpis`; reporte sintético #2 confirmó `CRITICA`/`PENDIENTE`, luego `PENDIENTE → EN_PROCESO → RESUELTA`. Cola final: #2 Resuelta. KPI observados: 2 del período, 1 abierta, 1 resuelta, MTTR 0,8 min, SLA 100 % (1/1), 0 vencidas. `PENDIENTE_SINC` persistió según el alcance mock.
- Límites/observaciones: la incidencia previa #1 se conservó; no se limpiaron datos ni se guardaron capturas. No se usaron datos personales reales y la demo no valida aceptación de Mallplaza. La ruta de gestión volvió a pedir login después de cerrar sesión y recargar; el navegador reportó `ERR_ABORTED` para la petición de logout durante el cambio de vista, evento a revisar en robustez.
- Próximo paso: revisar los hallazgos del audit de dependencias de desarrollo y preparar la demo final.

## Registro de avance — 2026-10-09 (auditoría de dependencias)

- Tarea completada: Vitest 4.1.11 y node-pg-migrate 8.0.4 con glob 11.1.0; bcrypt ya estaba en 6.0.0.
- Verificación: lint, 27 pruebas, `npm audit` completo con cero vulnerabilidades, `npm run db:migrate` y `npm run db:migrate:test`.
- Decisión: mantener Node.js 20.20.2 y Vite 7; evitar node-pg-migrate 9 porque la versión 8 ya elimina los hallazgos y pasa las rutas del proyecto.
- Próxima tarea: build final, aserción de cookie en logout y preparación de la exposición.

## Registro de avance — 2026-10-09 (preparación final)

- Tarea completada: aserción de logout agregada a la prueba de autenticación; valida 204, cookie expirada y 401 posterior. Build PWA final completado.
- Verificación: lint y 27 pruebas / 8 archivos; `npm audit` completo con 0; `db:migrate` y `db:migrate:test` sin migraciones pendientes; PWA Vite 7.3.7 / vite-plugin-pwa 2.0.0 compila y genera manifest/service worker. Los artefactos de `dist` generados se restauraron y no se incluyen en el cambio.
- Datos de demo: se conserva #1 y #2 según la aceptación visual reportada; no se limpió la base ni se creó otro registro.
- Límite: la causa de `ERR_ABORTED` del navegador no se pudo observar en una traza; la prueba de servidor sí confirma que el logout funciona.
- Próximo paso: ensayo académico usando el reporte #2, sin alterar datos.
