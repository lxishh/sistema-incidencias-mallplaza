# Cómo entender y defender el modelo de datos

## 1. Qué representa este esquema

`db/schema.sql` es el borrador de modelo físico que usa actualmente el prototipo. Se preparó en el diseño inicial con apoyo de IA; **no corresponde a un esquema recibido ni aprobado por Mallplaza**. La aplicación lo ejecuta como su modelo actual y la migración debe coincidir con él para que los entornos sean reproducibles. Esta condición técnica no demuestra validación empresarial.

La forma académicamente defendible es explicarlo como una **propuesta de modelo de datos construida para materializar los procesos y reglas del proyecto**. El equipo debe comprender cada decisión, revisar las oportunidades señaladas aquí y validar las modificaciones con su docente/equipo antes de presentarlas como definitivas. No decir que “Mallplaza definió estas tablas”. Si la institución tiene una regla de declaración de IA, cumplirla.

## 2. Cómo pensar el modelo en una frase

La entidad central es `incidencias`: cada reporte tiene una persona que lo registró (como RUT, no como cuenta del sistema), una ubicación, un tipo, factores de impacto, una prioridad calculada y un estado. El resto de las tablas guarda información que puede repetirse para esa incidencia: transiciones, fotos e intentos de sincronización. `usuarios` representa las cuentas de Jefatura; `sla_politica` guarda umbrales por prioridad.

## 3. Por qué usar una base relacional

El dominio tiene relaciones claras (una incidencia con varios eventos, fotos e intentos), y necesita conservar la secuencia de estados y hacer consultas por fechas/prioridad. PostgreSQL permite restricciones, transacciones y consultas SQL explícitas. En este caso los constraints y triggers refuerzan reglas que no deberían depender únicamente del formulario o de la API.

Se elige `pg` sin ORM para usar SQL parametrizado directamente y poder leer consultas/migraciones con claridad. La contrapartida es que el equipo debe escribir y revisar las consultas, migraciones y mapeo de datos manualmente.

## 3.1 Cómo se aplican ACID en el prototipo

ACID describe garantías de una transacción en PostgreSQL. En esta versión se aplican al trabajo local de la base; no incluyen una futura llamada de red a Casa Central ni almacenamiento S3.

| Propiedad | Aplicación en el código actual | Alcance / límite |
|---|---|---|
| Atomicidad | En `PATCH /api/incidencias/:id/estado`, la API toma un cliente dedicado del pool y ejecuta `BEGIN`, `SELECT ... FOR UPDATE`, `UPDATE` y `COMMIT`; ante error ejecuta `ROLLBACK`. El trigger inserta el evento de `historial_estados` como parte de ese mismo `UPDATE`. En el alta, el `INSERT` de incidencia dispara el historial inicial; ambas escrituras pertenecen a la misma sentencia/transacción implícita de PostgreSQL. | Para un alta, hoy hay una sola sentencia que crea la incidencia y el historial; no hay una transacción de aplicación explícita ni varias tablas adicionales que se escriban desde la ruta. |
| Consistencia | Enums, `NOT NULL`, `CHECK`, claves y triggers validan estados, fechas, RUT y relaciones. La API valida datos de entrada y la transición de negocio antes de escribir. | Las reglas se sostienen mientras se usen los roles y objetos de DB configurados; permisos de administración pueden alterar el esquema. |
| Aislamiento | El cambio de estado bloquea la fila concreta con `FOR UPDATE`; si dos solicitudes intentan avanzar simultáneamente la misma incidencia, se serializan sobre esa fila y la segunda evalúa el estado actualizado. PostgreSQL usa por defecto `READ COMMITTED`, y el proyecto no solicita otro nivel. | No se afirma aislamiento `SERIALIZABLE`. Las consultas de lectura del dashboard/listado son consultas separadas y no forman una fotografía transaccional común. |
| Durabilidad | Una respuesta exitosa se envía después del `COMMIT` del cambio de estado; PostgreSQL confirma la transacción según su configuración de persistencia. | Las garantías ante pérdida de instancia/volumen y recuperación dependen de configuración y respaldos del entorno. Docker local no demuestra la durabilidad/DR que tendría RDS. |

**Cómo defenderlo:** “Al cambiar el estado, usamos una transacción PostgreSQL. Bloqueamos la incidencia, validamos el paso, y el trigger actualiza fechas y añade el historial; si falla una parte, hacemos rollback. En el alta inicial, la fila y su evento inicial se escriben con una sola sentencia y trigger, que PostgreSQL trata atómicamente. La concurrencia se resuelve con bloqueo de fila y el nivel predeterminado `READ COMMITTED`; no configuramos `SERIALIZABLE`. La sincronización externa queda fuera de ACID y por ahora es un mock.”

**Alcance comprobado:** estas afirmaciones se basan en `backend/src/routes/incidencias.js` y `db/schema.sql`. La suite automatizada cubre transiciones/reglas e integridad, pero no es una prueba de estrés concurrente, fallo forzado del proceso ni recuperación ante desastre. Esas verificaciones se deben diseñar antes de producción.

## 4. Tablas: propósito y defensa oral

### `incidencias` — el reporte operativo

Es la tabla principal porque una falla tiene identidad propia y ciclo de vida. Los campos capturan los datos mínimos para clasificar (RUT, ubicación, tipo y tres booleanos), texto opcional, prioridad/estado y fechas del ciclo. Los campos de integración viven aquí porque el estado de sincronización y el ID de Casa Central describen el resultado actual del mismo incidente.

**Defensa oral:** “Cada formulario válido crea una fila de incidencia. La prioridad queda almacenada para mantener el resultado original del árbol; el tipo se conserva para análisis y no participa en la regla.”

### `usuarios` — acceso de Jefatura

Guarda cuentas de gestión. `password_hash` guarda un hash bcrypt y no la contraseña. `email` es único e insensible a mayúsculas por el tipo `citext`; `activo` permite bloquear una cuenta sin borrar sus eventos históricos. El enum tiene únicamente `JEFATURA` porque ese es el rol actual del prototipo.

**Defensa oral:** “No creamos cuentas para operarios: el reporte público se identifica con los campos del formulario y solo Jefatura necesita iniciar sesión en esta versión.”

### `historial_estados` — trazabilidad del ciclo

Una fila por evento, no solo el estado actual. Referencia a incidencia; guarda estado anterior/nuevo, fecha y usuario responsable. `usuario_id` puede ser nulo para la creación desde formulario público, donde no hay una cuenta Jefatura actuando.

**Por qué no basta `estado` en incidencia:** con solo el estado actual se perdería cuándo cambió, en qué orden y quién lo cambió. El historial es evidencia operativa para reconstruir el ciclo.

### `evidencias_fotograficas` — metadatos de adjuntos

Guarda referencia (`storage_key`), MIME, tamaño y orden; no almacena el binario en PostgreSQL. Una incidencia admite como máximo tres filas porque `orden` solo acepta 1, 2 o 3 y cada orden es único dentro de esa incidencia. Los MIME y los 2 MB se limitan en DB y también deben validarse en el endpoint.

**Defensa oral:** “Separar metadatos del objeto permite usar almacenamiento de archivos, por ejemplo S3 en producción. El prototipo aún no sube fotos, aunque la tabla ya plantea el contrato de metadatos.”

### `log_auditoria_api` — intentos hacia el sistema central

Una fila por intento, con número, fecha, status HTTP, resultado y un detalle de error acotado. La clave `(incidencia_id, numero_intento)` evita registrar dos veces el mismo correlativo. Los resultados distinguen respuesta correcta, error HTTP, timeout y error de red. `detalle_error` debe ser un mensaje seguro, nunca un token/llave ni payload sensible.

**Diferencia con el historial:** historial responde “¿qué pasó con el estado de la incidencia?”; auditoría responde “¿qué pasó con un llamado externo?”. El esquema/helper existen; todavía no existe worker que genere intentos en uso normal.

### `sla_politica` — umbrales por prioridad

Una fila por prioridad, con minutos de primera respuesta y resolución. Al estar separados de la incidencia, es posible leer o cambiar la política en datos y calcular vencimientos por prioridad. La tabla exige valores positivos y que resolución no sea menor que respuesta.

### Tipos ENUM

Los enums restringen ubicaciones, tipos de falla, prioridad, estado, rol y sincronización a valores conocidos. Reducen errores tipográficos y hacen explícitos los estados admitidos. Su costo es que agregar/cambiar un valor requiere migración coordinada y desplegar aplicación compatible.

## 5. Campos que se deben poder explicar

### Identificador personal

`rut_operario` es dato personal. Se valida formato y módulo 11 en API y base de datos para que no dependa solo del browser. No se devuelve en respuesta pública ni se escribe a logs; el detalle autenticado actual sí lo expone a Jefatura. La necesidad, finalidad, retención y si debe enmascararse son decisiones que el equipo debe revisar antes de producción.

### Booleanos de impacto

- `impacto_operativo`: indica afectación al funcionamiento.
- `riesgo_accidente`: indica un riesgo de seguridad.
- `afecta_terceros`: indica exposición de clientes/terceros.

Se separan porque la regla de prioridad distingue impacto operativo de riesgo y afectación a terceros. Son obligatorios para que el motor no infiera `false` cuando el usuario omitió contestar.

### Fechas

- `fecha_creacion`: inicio del incidente y referencia de los KPI solicitados.
- `fecha_inicio_proceso`: fijada cuando pasa a `EN_PROCESO`.
- `fecha_cierre`: fijada cuando pasa a `RESUELTA`.

Son `timestamptz` para almacenar instantes con zona/offset y calcular duraciones reales. Los filtros de reporte interpretan los días en `America/Santiago`; el instante persistido no depende de que el navegador use la misma zona.

## 6. Restricciones e índices, explicado sin memorizar nombres

| Mecanismo | Qué protege | Cómo se explica |
|---|---|---|
| CHECK de RUT | Ningún alta SQL directa puede guardar un RUT mal calculado. | La validación se repite en API y DB para defensa en profundidad. |
| CHECK de coherencia de estado/fechas | `PENDIENTE` sin inicio/cierre; `EN_PROCESO` con inicio pero sin cierre; `RESUELTA` con ambos tiempos. | Estado y marcas temporales deben contar la misma historia. |
| Trigger de transición | Solo acepta pendiente→proceso y proceso→resuelta; establece fechas. | La DB mantiene la regla incluso si se escribe fuera de Express. |
| Trigger de historial | Al insertar incidencia crea evento inicial; al cambiar estado crea uno nuevo. | El historial se mantiene junto con el cambio, en la misma transacción. |
| Trigger de inmutabilidad | Rechaza UPDATE/DELETE de historial y bitácora para el rol normal de la app. | Protege evidencia frente a cambios accidentales; no significa invulnerable a administradores de DB. |
| CHECK de foto + UNIQUE | Orden 1..3, MIME permitido, tamaño <=2 MB y orden único por incidencia. | Impone límites en el almacenamiento aunque la UI falle. |
| CHECK de sync | `ENVIADO` requiere ID externo; intentos no negativos. | El estado enviado debe tener evidencia de la orden asociada. |
| Índice cola | Prioridad/fecha para reportes no resueltos. | Acelera el caso de uso principal: Jefatura atiende primero la prioridad más alta/antigua. |
| Índices de filtros | Estado, ubicación, tipo, creación y próxima sincronización. | Preparan consultas frecuentes; confirmar con `EXPLAIN ANALYZE` cuando haya volumen real. |

Los índices son hipótesis de consulta para el prototipo, no una optimización ya probada con carga de producción.

## 7. Regla de prioridad con ejemplo

La regla se evalúa de arriba hacia abajo. Si una incidencia tiene riesgo de accidente y también impacto + alto tránsito, la primera condición gana y queda Crítica. Esto es intencional para que la condición de mayor severidad tenga precedencia. `tipo_falla = ELECTRICA` por sí sola nunca modifica prioridad.

| Impacto | Ubicación | Riesgo | Afecta terceros | Resultado |
|---|---|---|---|---|
| Sí | Alto tránsito | No | No | Crítica |
| No | Tránsito medio | Sí | No | Alta |
| Sí | Bajo tránsito | No | No | Media |
| No | Bajo tránsito | No | No | Baja |

La tabla completa de precedencia está implementada en `backend/test/rules.test.js` y se debe conservar cuando se amplíe el formulario.

## 8. Temas honestos para revisar con el equipo

No todo primer borrador debe defenderse como perfecto. Si el profesor pregunta, explica que se hizo una revisión técnica y señala estas decisiones:

1. **Vínculo prioridad–SLA:** `sla_politica.prioridad` y `incidencias.prioridad` usan el mismo enum, pero actualmente no hay foreign key entre tablas. Es una mejora de integridad a evaluar en una revisión de esquema; implica cambiar schema, migración y prueba.
2. **Política completa:** las cuatro filas SLA se insertan inicialmente, pero no hay constraint que impida que alguien las elimine/modifique luego. La administración de esa política debe definirse.
3. **Fotos:** el modelo relacional está planteado, pero upload, análisis de contenido, almacenamiento y autorización aún no están implementados.
4. **Auditoría sync:** tabla inmutable a nivel de triggers y helper existen; no hay worker, retry o conciliación.
5. **RUT:** el diseño lo guarda porque el formulario del prototipo lo exige; minimización, máscara, retención y acceso deben revisarse antes de datos reales.
6. **Tiempo de primera respuesta:** la columna SLA existe; falta acordar el evento que significa “respondida” para medirlo con consistencia.

No corregir ninguno de estos puntos en silencio. Proponer, registrar el impacto y aprobar la revisión antes de alterar el esquema conforme a las reglas del proyecto.

## 9. Respuestas breves para defensa oral

**¿El modelo lo entregó la empresa?**  
“No. Es una propuesta de diseño para el prototipo, elaborada durante el proyecto con asistencia de IA y revisada frente a las reglas funcionales que tenemos. No la presento como esquema corporativo. Puedo explicar cada entidad y las validaciones, y los puntos que requieren aprobación se documentan.”

**¿Por qué dejar historial y estado actual?**  
“El estado actual permite filtrar rápido; el historial permite reconstruir quién hizo cada transición y cuándo. Resuelven consultas distintas.”

**¿Por qué guardar prioridad si se puede recalcular?**  
“Se calcula al crear y se persiste como resultado auditable del árbol en ese momento. Así una futura modificación de reglas no reescribe silenciosamente cómo se clasificó una incidencia antigua.”

**¿Qué pasa si la API se salta la validación?**  
“Las restricciones y triggers de DB vuelven a validar consistencia y transición; la interfaz y API no son la única barrera.”

**¿Qué está listo y qué no?**  
“El prototipo local tiene backend, PWA de formulario JSON y gestión, KPI, persistencia, autenticación, prioridad e historial, verificados con pruebas y un recorrido sintético. QR gráfico y fotos no están implementados; sincronización real, AWS productivo y DR son fases posteriores.”

## 10. Forma correcta de presentarlo en el informe universitario

Usar: “Se diseñó un modelo relacional inicial para representar los casos de uso del prototipo; se implementaron restricciones y pruebas para validar reglas de integridad.” No usar: “Este es el esquema oficial de Mallplaza”, “la empresa aprobó el modelo” o “la integración productiva está probada”, salvo que después exista evidencia real.

