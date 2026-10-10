# Traspaso de contexto para Antigravity

**Proyecto:** Sistema de Gestión y Trazabilidad de Incidencias — Mallplaza Copiapó

**Fecha de actualización:** 9 de octubre de 2026

**Propósito:** permitir que otro agente continúe el trabajo desde el repositorio sin depender del historial de chat.

## 1. Leer antes de actuar

En este orden:

1. `AGENTS.md`: reglas obligatorias, stack, invariantes y cambios que requieren aprobación.
2. `docs/estado-proyecto.md`: estado vivo, evidencias y restricciones del entorno.
3. `docs/justificacion-modelo-datos.md`: explicación y límites de `db/schema.sql`.
4. Este traspaso: mapa de trabajo, Git y orden recomendado.
5. `docs/informe-proyecto.md`: fuente consolidada para el informe académico; `docs/informe-proyecto.docx` es su entrega Word.
6. `docs/ejecucion-local.md` y `docs/guion-demostracion-local.md` antes de iniciar servicios o manipular datos de demo.

No tratar el texto del informe como prueba superior a la implementación: confirmar rutas y comportamiento en el código. Si hay discrepancias, investigar y actualizar ambos documentos con evidencia.

## 2. Resumen del proyecto

Prototipo web local para reportar incidencias operativas, calcular prioridad de forma determinista y permitir que Jefatura gestione el ciclo de vida. Su objetivo es apoyar el seguimiento operacional; no es un sistema productivo ni una integración institucional activa.

La empresa objetivo del proyecto académico es Mallplaza Copiapó. No hay constancia documentada de aprobación de Mallplaza, especificación entregada por la empresa, UAT con cliente ni credenciales/contrato técnico de Casa Central. Presentar el estado con honestidad académica: prototipo construido por el equipo con asistencia de IA donde corresponda, datos sintéticos y arquitectura productiva propuesta.

## 3. Qué está implementado

### Backend

- Node.js 20, Express, PostgreSQL con `pg` y SQL parametrizado, Zod, bcrypt, JWT, `pino` y `express-rate-limit`.
- Prioridad como función pura en `backend/src/rules/prioridad.js`.
- RUT módulo 11 validado; el alta pública no devuelve RUT y el logging lo redacta.
- Login/logout/sesión de Jefatura; cookie `httpOnly`, `SameSite=Strict`, 8 horas y `Secure` en producción. Solo existe el rol `JEFATURA`.
- API de catálogos, alta pública JSON, consulta/listado, detalle e historial, transiciones de estado y KPI.
- Trigger de PostgreSQL protege la transición de estados y genera historial. La API responde conflicto para transiciones inválidas.
- El cambio de estado usa transacción explícita y bloqueo de fila. PostgreSQL queda en `READ COMMITTED` predeterminado; no se probó concurrencia de carga ni recuperación ante desastre.
- `CasaCentralClient` es un adaptador mock. El alta conserva `PENDIENTE_SINC`; no existe worker ni se crea una orden externa.

### Frontend

- PWA responsiva Vite: formulario JSON público, inicio de sesión, cola, filtros, detalle, historial, transición de estados y tablero KPI.
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

- Lint, build PWA, 27 pruebas backend en 8 archivos, migraciones y `npm audit` completo reportados aprobados / cero vulnerabilidades.
- Recorrido UI local con datos ficticios: caso #2 `CRITICA`, `PENDIENTE → EN_PROCESO → RESUELTA`; KPI observados MTTR 0,8 min, SLA 100 % (1/1), una abierta, una resuelta, cero vencidas. La incidencia #1 se conservó.
- Prueba de logout de backend: HTTP 204, cookie vaciada y posterior 401 en `/api/auth/me`.
- Navegador mostró `ERR_ABORTED` en petición logout al cambiar vista. La sesión quedó cerrada al recargar; la causa exacta del evento no se diagnosticó.

Durante el cierre documental posterior, `git diff --check` pasó. **No se repitió lint/tests/build en esa sesión**: Ubuntu no tenía `node`; el `npm` del PATH apuntaba a CMD de Windows y, lanzado desde WSL/UNC, falló buscando `C:\\Windows\\backend\\package.json`. Las pruebas previas son evidencia histórica, no resultado de una nueva ejecución. Primer paso técnico recomendado: disponer de Node 20 y npm nativos en Ubuntu y reejecutar lint, suite y build.

El DOCX tiene 27 páginas y se inspeccionó visualmente tras exportarlo desde Microsoft Word a PDF y renderizarlo con pypdfium2. No se pudo usar `render_docx.py` porque la runtime carecía de LibreOffice. Diagramas Mermaid/PlantUML están incluidos como fuentes de texto; no equivalen necesariamente a figuras BPMN/UML exportadas que pueda exigir la rúbrica.

## 6. Pendientes ordenados por prioridad

### P0 — antes de nuevas funcionalidades

1. Revisar `git status`, rama actual y cambios sin commit.
2. Configurar Node 20 + npm nativos en Ubuntu; evitar el `npm` de Windows desde rutas UNC.
3. Ejecutar `npm run lint`, `npm test` y `npm run build:frontend` desde la raíz; guardar versión Node y salida/fecha en `docs/estado-proyecto.md`.
4. Si falla, aislar el fallo y corregir solo lo necesario. No actualizar paquetes masivamente ni borrar lockfiles por defecto.
5. Seguir `docs/ejecucion-local.md` y repetir la demo de forma controlada, preservando la base si se usa `mallplaza_dev`.

### P1 — cierre académico

1. Confirmar con pauta/profesor si Mermaid/PlantUML como fuente basta o si se necesitan BPMN 2.0/UML exportados.
2. Revisar fuentes bibliográficas, citas, fechas, nombre de curso/equipo y formato institucional; no inventar integrantes o aprobaciones.
3. Leer y practicar la explicación del modelo en `docs/justificacion-modelo-datos.md`, especialmente prioridad, triggers, historial, datos personales y ACID.
4. Si hay tiempo, crear QR de demostración que apunte a un host local accesible en la red de demo y documentar sus límites; no afirmar que existe hoy.

### P2 — fases posteriores, no bloquear la entrega local

- Fotos: definir autorización/retención, endpoint multipart seguro, almacenamiento local/S3, tipos reales, límites, acceso y pruebas. El stack incluye Multer, pero no está implementado en la ruta actual.
- Casa Central: obtener contrato técnico aprobado (endpoint, auth, payload, idempotencia, timeout, errores, sandbox), luego implementar worker/reintentos/reconciliación con auditoría sin secretos.
- AWS: cuenta, presupuesto, región, responsables, dominio, IAM y política operativa; diseñar/desplegar VPC/EB/RDS/S3/secretos/monitorización conforme a aprobación. No desplegar por inferencia.
- Producción: pruebas de carga, seguridad, accesibilidad, respaldos/restauración, HA/DR, TLS y observabilidad.

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

- Rama activa del checkout: `docs/S1-academic-closeout`.
- `origin` configurado: `https://github.com/lxishh/sistema-incidencias-mallplaza.git`.
- Último bloque documental está local y limpio al crear este traspaso. No se hizo push ni PR.
- Commits anteriores en el estado actual: `303f153`, `de67d96`, `b6812f0`, `8c8fdab`, `cd9cd57`, `61b48e4`, `894d49f`, `00f4e4f`.
- Ramas visibles: `develop` apunta a `00f4e4f`; `feature/S1-dashboard-kpis` a `cd9cd57`; `chore/S1-dev-dependency-audit` a `8c8fdab`; `docs/S1-academic-closeout` contiene el cierre documental sobre `8c8fdab`.
- No cambiar a `develop`, hacer merge, rebase, reset, push o PR sin revisar primero el grafo/diff y confirmar qué rama remota es la base del grupo. El código implementado vive en la historia común anterior a `8c8fdab`; no asumir que todos los commits están publicados.
- Convención: tarea acotada, rama identificable, Conventional Commit y pruebas. No subir `.env`, dumps, tokens ni datos personales.

## 9. Cambios y aprobaciones reservadas

Antes de cambiar: regla de prioridad, stack, payload de Casa Central o `db/schema.sql`. Para el esquema se debe explicar razón e impacto en `docs/justificacion-modelo-datos.md`, actualizar migración y pruebas, y obtener aprobación explícita del usuario. En caso de ambigüedad, anotar pregunta en `docs/preguntas.md` y continuar solo con supuesto claramente marcado de prototipo.

Nunca afirmar aprobación de Mallplaza, conexión real, producción AWS, cumplimiento/certificación normativa, UAT o SLA contractual sin evidencia verificable.

## 10. Prompt inicial sugerido para Antigravity

> Continúa el proyecto desde el checkout existente. Lee primero `AGENTS.md`, `docs/estado-proyecto.md`, `docs/justificacion-modelo-datos.md` y `docs/HANDOFF-ANTIGRAVITY.md`. No clones encima ni cambies de rama: verifica `git status`, `git branch -vv` y `git log --graph --all`. Primero resuelve/verifica Node 20 nativo en Ubuntu y ejecuta lint, tests y build PWA. Si el entorno no permite hacerlo, documenta el bloqueo sin declarar tests verdes. No cambies prioridad, stack, payload institucional ni `db/schema.sql` sin aprobación. Preserva la base sintética y no publiques cambios al remoto. Después de verificar, actualiza `docs/estado-proyecto.md` y `docs/informe-proyecto.md` con evidencia y propone la siguiente tarea de menor riesgo.
