# Prompt para Antigravity (copiar y pegar)

> Eres el agente que continúa este proyecto desde el checkout existente (Sistema de Gestión y Trazabilidad de Incidencias, Mallplaza Copiapó; proyecto académico, prototipo local).
>
> **Antes de actuar, lee en este orden:** `AGENTS.md`, `docs/HANDOFF-ANTIGRAVITY.md`, `docs/estado-proyecto.md`, `docs/preguntas.md` (al final) y `docs/justificacion-modelo-datos.md`. No cambies de rama, no hagas reset, rebase ni push, y no clones encima: verifica `git status`, `git branch -vv` y `git log --oneline -8`.
>
> **Reglas que no puedes romper:** no cambies la regla de prioridad, el stack, el payload de Casa Central ni `db/schema.sql` sin aprobación explícita mía. No resuelvas por inferencia las decisiones D1 a D12 de `docs/preguntas.md`. No afirmes aprobación de Mallplaza, conexión real con Casa Central, despliegue en AWS, cumplimiento normativo ni UAT sin evidencia. No pongas el RUT ni secretos en registros o documentos. No actualices dependencias en bloque ni borres lockfiles.
>
> **Trabaja por pasos y detente al terminar cada uno para que yo revise:**
> 1. **Verificación (P0).** Confirma que existe `docs/entregables/` y que el estado de Git es el descrito. Con Node 20 nativo en Ubuntu, ejecuta `npm run lint`, `npm test` y `npm run build:frontend`. Anota versión de Node, fecha y resultado en `docs/estado-proyecto.md`. Si algo no se puede ejecutar, di exactamente por qué; no declares pruebas verdes sin haberlas corrido.
> 2. **TC-46.** Propón por escrito dos opciones para el token de sesión que no se revoca al cerrar sesión (acortar la vigencia, o revocación por versión de token, que exige migración). **Espera mi elección** antes de implementar.
> 3. **RF-40.** Verifica si la cola muestra por incidencia el estado de sincronización con etiquetas legibles. Si no, impleméntalo solo en el frontend, sin cambiar la API, y verifícalo.
> 4. **Cierre.** Actualiza `docs/estado-proyecto.md` con lo hecho, las pruebas ejecutadas, los límites y el siguiente paso, e indícame qué filas de la matriz de trazabilidad cambian.
>
> **Git:** haz un commit local por tarea terminada, en la rama actual, con mensajes en formato Conventional Commits. Nunca hagas push.
>
> **No hagas todavía:** fotos, worker de reintentos, cliente real de Casa Central, QR por sector, AWS ni cambios de esquema. Si una tarea te exige una decisión mía, anota la pregunta en `docs/preguntas.md` y avísame.
>
> Al terminar cada paso, entrégame: qué cambiaste (archivos), qué ejecutaste y su resultado real, qué no pudiste verificar y qué decides que necesito tomar yo.
