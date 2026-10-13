# Traspaso de contexto para Antigravity

**Proyecto:** Sistema de Gestión y Trazabilidad de Incidencias — Mallplaza Copiapó

**Fecha de actualización:** 10 de octubre de 2026

**Propósito:** permitir que otro agente continúe el trabajo desde el repositorio sin depender del historial de chat.

## 1. Leer antes de actuar

En este orden:

1. `AGENTS.md`: reglas obligatorias, stack, invariantes y cambios que requieren aprobación.
2. `docs/estado-proyecto.md`: estado vivo, evidencias y restricciones del entorno.
3. `docs/justificacion-modelo-datos.md`: explicación y límites de `db/schema.sql`.
4. Este traspaso: mapa de trabajo, Git y orden recomendado.
5. `docs/informe-proyecto.md`: fuente consolidada para el informe académico; `docs/informe-proyecto.docx` es su entrega Word.
6. `docs/ejecucion-local.md` y `docs/guion-demostracion-local.md` antes de iniciar servicios o manipular datos de demo.
7. `docs/preguntas.md`, al final: decisiones D1 a D12 pendientes con el cliente o el usuario. No resolverlas por inferencia.
8. `docs/entregables/Matriz_trazabilidad_RF_RNF.xlsx` (hojas Resumen, Matriz RF y Casos de prueba): qué RF están construidos, con qué prueba, y qué falta.
9. `docs/entregables/capitulo-analisis-diseno.md`: capítulo académico (BPMN, UML, topología, KPI, pruebas). Es documentación; no modificar su contenido técnico sin evidencia.

No tratar el texto del informe como prueba superior a la implementación: confirmar rutas y comportamiento en el código. Si hay discrepancias, investigar y actualizar ambos documentos con evidencia.

## 2. Resumen del proyecto

Prototipo web local para reportar incidencias operativas, calcular prioridad de forma determinista y permitir que Jefatura gestione el ciclo de vida. Su objetivo es apoyar el seguimiento operacional; no es un sistema productivo ni una integración institucional activa.

La empresa objetivo del proyecto académico es Mallplaza Copiapó. No hay constancia documentada de aprobación de Mallplaza, especificación entregada por la empresa, UAT con cliente ni credenciales/contrato técnico de Casa Central. Presentar el estado con honestidad académica: prototipo construido por el equipo con asistencia de IA donde corresponda, datos sintéticos y arquitectura productiva propuesta.

## 3. Qué está implementado

### Backend

- Node.js 20, Express, PostgreSQL con `pg` y SQL parametrizado, Zod, bcrypt, JWT, `pino` y `express-rate-limit`.
- Prioridad como función pura en `backend/src/rules/prioridad.js`.
- RUT módulo 11 validado; el alta pública no devuelve RUT y el logging lo redacta.
- Login/logout/sesión de Jefatura; cookie `httpOnly`, `SameSite=Strict`, configurable con `SESSION_TTL_MINUTES` (30 minutos por defecto) y `Secure` en producción. Solo existe el rol `JEFATURA`.
- API de catálogos, alta pública JSON, consulta/listado, detalle e historial, transiciones de estado y KPI.
- Trigger de PostgreSQL protege la transición de estados y genera historial. La API responde conflicto para transiciones inválidas.
- El cambio de estado usa transacción explícita y bloqueo de fila. PostgreSQL queda en `READ COMMITTED` predeterminado; no se probó concurrencia de carga ni recuperación ante desastre.
- `CasaCentralClient` es un adaptador mock. El alta conserva `PENDIENTE_SINC`; no existe worker ni se crea una orden externa.

### Frontend

- PWA responsiva Vite: formulario JSON público, inicio de sesión, cola, filtros, detalle, historial, transición de estados y tablero KPI. Jefatura sondea lista, KPI y detalle abierto cada 10 segundos mientras la pestaña de gestión está visible; el sondeo se pausa cuando pasa a segundo plano.
- No hay QR gráfico distribuible ni carga de imágenes.
- `frontend/dist` está ignorado/no es fuente de verdad; compilar desde el código fuente.

### Base de datos

- PostgreSQL 15+ en Docker Compose local; migración `db/migrations/20261009000100-initial-schema.js` reproduce el modelo de `db/schema.sql`. Docker Compose también construye API y frontend; el arranque completo es `docker compose up --build`.
- El esquema se creó en el diseño del prototipo con asistencia de IA. No proviene de Mallplaza ni está aprobado por la empresa. Leer `docs/justificacion-modelo-datos.md` antes de modificarlo.
- La base de demo puede conservar incidencias sintéticas #1 y #2. No borrar volúmenes ni reinicializarla sin que el usuario/equipo lo pida explícitamente.

## 4. Reglas que no se deben alterar por conveniencia

### Prioridad (orden de primera coincidencia)

1. `impacto_operativo` y `ubicacion === ALTO_TRANSITO` → `CRITICA`.
2. `riesgo_accidente` o `afecta_terceros` → `ALTA`.
3. `ubicacion === ALTO_TRANSITO` o `impacto_operativo` → `MEDIA`.
4. Si ninguna se cumple → `BAJA`.

`tipo_falla` se guarda, pero no participa en la prioridad.

### Estados

`PENDIENTE → EN_PROCESO → RESUELTA`; solo hacia adelante. No resolver saltando `EN_PROCESO`.

### Formulario

Obligatorios: RUT válido (`12345678-5` módulo 11), ubicación, tipo de falla y tres booleanos de impacto/riesgo/terceros. Comentario opcional hasta 1000 caracteres. Fotos 0–3, máximo 2 MB c/u, JPEG/PNG/WebP es un requisito futuro; la API actual acepta JSON y no procesa fotos.

### KPI/SLA

- MTTR de resueltas: promedio entre creación y cierre, minutos.
- Cumplimiento SLA de resolución: resueltas dentro del umbral de prioridad / resueltas.
- Umbrales: Crítica 240, Alta 480, Media 1440, Baja 4320 minutos.
- Rango por `fecha_creacion`, con días según `America/Santiago`; otros conteos incluyen vencidas abiertas y dimensiones prioridad/tipo/ubicación/sincronización.
- La política/objetivos aún requieren validación de negocio; no llamarlos SLA contractual.

## 5. Evidencia disponible y límites de verificación

En avances previos, documentados el 9 de octubre:

- Lint, build PWA, 33 pruebas backend en 9 archivos, migraciones y `npm audit` completo reportados aprobados / cero vulnerabilidades.
- Recorrido UI local con datos ficticios: caso #2 `CRITICA`, `PENDIENTE → EN_PROCESO → RESUELTA`; KPI observados MTTR 0,8 min, SLA 100 % (1/1), una abierta, una resuelta, cero vencidas. La incidencia #1 se conservó.
- Prueba de logout de backend: HTTP 204, cookie vaciada y posterior 401 en `/api/auth/me`.
- Navegador mostró `ERR_ABORTED` en petición logout al cambiar vista. La sesión quedó cerrada al recargar; la causa exacta del evento no se diagnosticó.

Durante el cierre documental posterior, `git diff --check` pasó. **No se repitió lint/tests/build en esa sesión**: Ubuntu no tenía `node`; el `npm` del PATH apuntaba a CMD de Windows y, lanzado desde WSL/UNC, falló buscando `C:\\Windows\\backend\\package.json`. Las pruebas previas son evidencia histórica, no resultado de una nueva ejecución. Primer paso técnico recomendado: disponer de Node 20 y npm nativos en Ubuntu y reejecutar lint, suite y build.

El DOCX tiene 27 páginas y se inspeccionó visualmente tras exportarlo desde Microsoft Word a PDF y renderizarlo con pypdfium2. No se pudo usar `render_docx.py` porque la runtime carecía de LibreOffice. Diagramas Mermaid/PlantUML están incluidos como fuentes de texto; no equivalen necesariamente a figuras BPMN/UML exportadas que pueda exigir la rúbrica.

## 6. Pendientes ordenados por prioridad

### P0 — verificar el estado recibido (sin cambiar código)

1. Revisar `git status`, rama actual y `git log --oneline -8`. Debe existir la rama `docs/entregables-10-oct` con el paquete de documentación ya aplicado; no cambiar de rama ni hacer reset.
2. Node 20 y npm nativos en Ubuntu (no el `npm` de Windows desde rutas UNC). Ejecutar `npm run lint`, `npm test` y `npm run build:frontend` desde la raíz y guardar versión de Node, fecha y salida resumida en `docs/estado-proyecto.md`. Línea base conocida: 33 pruebas en 9 archivos aprobadas el 10-oct-2026.
3. Confirmar que existe `docs/entregables/` con la planilla, el Word y `diagramas/` (12 imágenes referenciadas por `capitulo-analisis-diseno.md`). Si falta algo, avisar; no recrearlo.
4. Revisar `.github/workflows/ci.yml` (no se ha ejecutado aún en GitHub) y reportar cualquier incoherencia con los scripts reales, sin cambiar la lógica de las pruebas.

### P1 — tareas de código acotadas (en este orden, una por vez, detenerse tras cada una)

1. **TC-46, token de sesión.** Hallazgo: la cookie copiada antes de cerrar sesión sigue siendo válida hasta 8 horas. Proponer por escrito dos opciones: (a) acortar la vigencia del JWT (sin cambios de esquema), o (b) revocación con una versión de token por usuario (requiere migración: aprobación explícita). Esperar la elección del usuario antes de implementar. Con la elección, agregar prueba que reproduzca TC-46 (`scripts/ejecutar-casos-api.js` ya lo detecta).
2. **RF-40, estado de sincronización en la cola.** Verificar en `frontend/src/main.js` que la cola muestre por incidencia el estado de sincronización con etiquetas legibles (Enviado a Casa Central, Pendiente de sincronización, Error de envío). Si no lo hace, implementarlo solo en el frontend, sin cambiar la API, con su verificación.
3. **Documentar** cada tarea cerrada en `docs/estado-proyecto.md` con fecha, pruebas ejecutadas, límites y siguiente paso, e indicar qué filas de la matriz de trazabilidad cambian (el usuario actualiza la planilla).

### P2 — solo con aprobación explícita y decisiones previas

- Fotos (RF-12, RF-13, RF-35, RNF-11): antes de programar, el usuario debe definir retención, quién puede verlas, almacenamiento (local o S3), formatos y tamaño. Validar el contenido real del archivo, no solo el tipo MIME. El requisito RF-12 es ambiguo (opcional pero mínimo 1): decisión D5.
- Worker de reintentos (RF-39) y cliente real de Casa Central (RF-36 a RF-40): requieren contrato técnico aprobado (decisión D2/D11 y cuestionario de integración). Hoy solo existe el cliente simulado.
- QR por sector o tabla de zonas: **no implementar.** `docs/propuesta-ubicaciones-qr.md` es opcional y cambiaría RF-04 y RF-05 (decisiones D3 y D4).
- AWS, HTTPS y producción: no desplegar por inferencia; hay decisiones de presupuesto abiertas (D9, D10, D11, D12).

### No son tareas del agente

Resolver las decisiones D1 a D12 con Mallplaza, probar el QR en iPhone y Android reales, la aceptación (UAT) con la Jefatura, la bibliografía, la portada y el formato institucional del informe, y publicar cambios al remoto.

## 7. Comandos locales

Solo en Ubuntu/WSL, desde `/home/localdev/sistema-incidencias-mallplaza`:

```bash
node --version
npm --version
docker compose up -d postgres
npm run lint
npm test
npm run build:frontend
```

Para levantar la demo completa, seguir `docs/ejecucion-local.md` (requiere variables de desarrollo y seed ficticio). La suite puede requerir PostgreSQL de pruebas y `backend/.env.test`; no imprimir ni copiar `.env`, credenciales o secretos al chat ni a documentación.

## 8. Git actual y cuidado de ramas

- `origin`: `https://github.com/lxishh/sistema-incidencias-mallplaza.git`.
- Publicado: una sola rama, `feature/S1-demo-qr` (por defecto), 15 commits lineales del 9-oct-2026, todos del mismo autor. No hay PR abiertos.
- `develop`, `feature/S1-dashboard-kpis`, `chore/S1-dev-dependency-audit` y `docs/S1-academic-closeout` existieron localmente; no están publicadas y sus commits ya están dentro de la historia de `feature/S1-demo-qr`.
- `frontend/dist` no se versiona (está en `.gitignore`); se genera con `npm run build:frontend`.
- No hacer merge, rebase, reset ni force-push sin revisar antes el grafo/diff y confirmar con el grupo qué rama es la base.
- Convención: tarea acotada, rama identificable, Conventional Commit y pruebas. No subir `.env`, dumps, tokens ni datos personales.

## 9. Cambios y aprobaciones reservadas

Antes de cambiar: regla de prioridad, stack, payload de Casa Central o `db/schema.sql`. Para el esquema se debe explicar razón e impacto en `docs/justificacion-modelo-datos.md`, actualizar migración y pruebas, y obtener aprobación explícita del usuario. En caso de ambigüedad, anotar pregunta en `docs/preguntas.md` y continuar solo con supuesto claramente marcado de prototipo.

Nunca afirmar aprobación de Mallplaza, conexión real, producción AWS, cumplimiento/certificación normativa, UAT o SLA contractual sin evidencia verificable.

## 10. Prompt inicial sugerido para Antigravity

El texto vigente para pegar está en `docs/PROMPT-ANTIGRAVITY.md`.
