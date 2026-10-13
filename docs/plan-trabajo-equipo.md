# Plan de trabajo del equipo (10 a 14 de octubre de 2026)

**Objetivo:** llegar al 14-oct con un prototipo local que se pueda demostrar sin sorpresas, con trabajo repartido y trazable en GitHub.
**Hoy:** el 100 % de los commits son de Luis. Este plan reparte tareas con criterios de aceptación para que Jorge y Benjamín puedan tomar una sin pedir contexto.

> Los responsables son una **sugerencia**: Luis conoce las fortalezas de cada uno y ajusta. Las tallas son orientativas: S hasta 2 h, M medio día, L cerca de un día. Los RF salen de los comentarios de `db/schema.sql`; los que no aparecen ahí hay que enlazarlos desde el catálogo de 40 RF.

## Reglas de trabajo (mínimas)

1. Una rama por issue, nombrada `feature/<id>-<tema>`, y un PR hacia `develop`. Aunque nadie revise a fondo, el PR queda como registro de quién hizo qué.
2. Commits con Conventional Commits y actualizando `docs/estado-proyecto.md` **en el mismo commit**, sin commits aparte de "registrar el hash".
3. `npm run lint && npm test` en verde antes de abrir el PR (el CI de `.github/workflows/ci.yml` lo verifica).
4. Nada de `frontend/dist`, `.env` ni datos reales en commits.

## Antes del 14-oct (en este orden)

| ID | Tarea | Sugerido | Talla | Depende de | Criterio de aceptación |
|---|---|---|---|---|---|
| T1 | Aplicar la limpieza de Git: parche de docs, `git rm -r --cached frontend/dist`, crear `main` y `develop`, activar CI | Luis | S | — | `git ls-files frontend/dist` vacío; CI en verde en GitHub; docs sin contradicciones sobre ramas |
| T2 | Pedir a Mauricio la lista de ubicaciones/sectores y las respuestas bloqueantes (`docs/preguntas.md`: Casa Central, uso del RUT, quién usa el QR) | Benjamín | S | — | Lista recibida o fecha comprometida; preguntas bloqueantes con responsable y fecha |
| T3 | Aprobar o ajustar `docs/propuesta-ubicaciones-qr.md` | Luis + equipo | S | — | Decisión registrada: aprobada, ajustada o descartada |
| T4 | Migración nueva de `ubicaciones` + `GET /api/ubicaciones/:codigo` + `codigo_ubicacion` en el alta, con pruebas | Luis | M | T3 | Las 33 pruebas actuales siguen en verde; pruebas nuevas para código válido, inexistente e inactivo |
| T5 | Formulario con ubicación precargada y campo manual de código; datos `DEMO` ficticios | Jorge (o Luis) | M | T4 | Al ingresar un código, el formulario muestra el lugar y bloquea la ubicación; sin código funciona como hoy |
| T6 | Investigar el `ERR_ABORTED` del logout con traza de red | Jorge | S | — | Causa identificada o descartada con evidencia; nada se afirma sin traza |
| T7 | Ensayos de demo (`docs/guion-demo-14-oct.md`) en el equipo de exposición, con celular real | Todos | S | T1 a T5 | Dos ensayos completos sin intervención manual fuera del guion |

## Después del 14-oct (backlog)

| ID | Tarea | RF | Sugerido | Talla | Notas |
|---|---|---|---|---|---|
| T8 | Carga de fotos: endpoint multipart, 0 a 3 imágenes, hasta 2 MB, jpeg/png/webp | RF-12, 13, 35, RNF-11 | Jorge | L | Validar el contenido real del archivo, no solo el tipo MIME enviado. `multer` figura en el stack pero no está instalado. Definir antes retención y quién puede ver las fotos |
| T9 | Escáner de QR con cámara en la PWA | — | Benjamín o Jorge | L | Requiere elegir librería de lectura (aprobación de stack) y HTTPS para probar en celular |
| T10 | Administración de ubicaciones y hoja de QR imprimible | — | Luis | M | Reutiliza el generador de QR existente; el contenido pasa a ser el código |
| T11 | Gráficos en el panel de KPI | por confirmar | Benjamín | M | Chart.js está en el stack pero no instalado. KPI por prioridad, tipo, ubicación y sector |
| T12 | Worker de sincronización con Casa Central | RF-36 a 40 | Luis | L | Bloqueado por el contrato externo; seguir con el mock hasta tenerlo |
| T13 | Pruebas en iPhone y Android reales | por confirmar | Todos | M | Instalar la PWA, formulario, rendimiento |

## Por qué este orden

El mayor riesgo para el 14-oct no es técnico sino de definiciones: sin lista de ubicaciones (T2) y sin decisión sobre el modelo (T3) no se puede construir lo que más diferencia al sistema. Las fotos, AWS y Casa Central real ya estaban acordadas como no prioritarias en `docs/estado-proyecto.md`; este plan lo mantiene.

## Crear los issues en GitHub

`scripts/crear-issues.sh` crea estos issues con la CLI `gh` (ya autenticada con `gh auth login`). Revisar los responsables antes de ejecutarlo.
