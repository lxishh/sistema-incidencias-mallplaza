# Supuestos y decisiones — Sprint 1

Este archivo conserva decisiones locales del Sprint 1. Para completar el diseño de grupo, mantener las preguntas abiertas listadas abajo; no cerrar ninguna con un supuesto silencioso.

- El checkout actual sí tiene `.git`, remoto `origin` y ramas/commits locales. La rama activa registrada es `docs/S1-academic-closeout`; todavía no se hizo push ni PR. Confirmar con el equipo qué remoto/base son oficiales antes de integrar historia.
- PostgreSQL local usa el usuario/contraseña `mallplaza` / `mallplaza_dev`; el volumen de Compose inicializa `mallplaza_test` mediante un script SQL. Para reinicializar ambas bases desde cero se debe borrar explícitamente el volumen local.
- `JWT_SECRET` debe tener al menos 32 caracteres. Las pruebas cargan `backend/.env.test` automáticamente. La suite de integración requiere iniciar primero PostgreSQL con Docker Compose.
- La integración de Casa Central solo simula resultados y genera el ID ficticio `MOCK-1`; no representa el contrato ni un payload de producción. `registrarIntento` implementa el mapeo y guardado de resultados para un worker futuro, pero no hay worker encolando intentos ni filas automáticas en esta etapa.
- El endpoint de detalle, accesible solo a Jefatura, puede exponer el RUT según la decisión de contrato; las respuestas públicas y logs lo excluyen.
- En errores de base de datos se registra únicamente nombre, mensaje, código y stack fuera de producción; nunca `detail`, `where`, `parameters` ni `config`.

## Preguntas que requieren respuesta del cliente/equipo

### Negocio y operación

- ¿Quién recibe y atiende cada prioridad? ¿Se requiere asignación formal a técnico/área, o solo seguimiento por Jefatura?
- ¿Qué significa exactamente “primera respuesta” del SLA y cuál es el horario de servicio? ¿Se cuentan noches, fines de semana y festivos?
- ¿Qué metas de disponibilidad, p95, RTO, RPO y soporte se comprometen? ¿Qué mantenimiento se excluye del cómputo?
- ¿Quiénes son los usuarios reales de UAT y quién aprueba la aceptación?

### Casa Central

- ¿Cuál es la URL, autenticación, payload, catálogo de errores, timeout, límites, idempotencia y mecanismo de sandbox?
- ¿Qué sistema asigna `id_externo_mallplaza` y cómo reconciliar una respuesta perdida después de que Casa Central creó una orden?
- ¿Qué política de reintentos/backoff y reenvío manual requiere la contraparte? ¿Quién recibe alertas y puede cerrar un error?

### Datos, fotos y privacidad

- ¿Se requiere guardar RUT? ¿Qué finalidad y período de retención aplican? ¿El detalle autenticado lo necesita o debe enmascararse?
- ¿Cuál es el aviso de privacidad, canal de derechos, responsable del tratamiento y proceso de borrado/anonimización?
- ¿Qué retención, resolución/calidad y límites agregados se requieren para fotos? ¿Quién puede verlas y por cuánto tiempo?
- ¿Qué datos reales pueden usarse en pruebas? La recomendación es usar datos sintéticos y prohibir dumps productivos.

### AWS y despliegue

- ¿Qué cuenta/región AWS, presupuesto, dominios, ambientes y responsables de operación se usarán?
- ¿Se aprueba Multi-AZ para Beanstalk/RDS? ¿Qué tamaño, autoscaling, ventana de mantenimiento y retención de backup se necesitan?
- ¿Qué monitoreo, canal de guardia, retención de logs y contacto de escalamiento estarán activos?
- ¿Dónde residirá el repositorio oficial y qué reglas de ramas/PR debe adoptar el grupo? El checkout actual no trae `.git`.

### Proyecto académico

- ¿Qué formato de entrega requieren para BPMN/UML y bibliografía: diagramas nativos editables, capturas o código fuente de diagramas?
- ¿Cuál es fecha límite, composición del equipo, disponibilidad semanal y rúbrica para fijar el Gantt y metas SMART definitivas?
- ¿Se requiere evidencia formal de seguridad/accesibilidad (checklist, escaneo, revisión manual) y qué nivel solicita el curso?

