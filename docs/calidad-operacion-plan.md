# Calidad, operación, continuidad y planificación

## 1. Plan de pruebas

El plan combina pruebas unitarias, integración y aceptación. El backend y el recorrido local principal tienen verificaciones registradas; las filas pendientes indican lo necesario antes de liberar el sistema productivo, en particular archivos, QR, seguridad/rendimiento y operación AWS.

| Tipo | Casos/criterio de salida | Estado |
|---|---|---|
| Unitarias de prioridad | Tabla de verdad con las cuatro reglas, precedencia y `tipo_falla` sin efecto. | Implementado: 1 prueba de tabla con casos combinados. |
| Validación de RUT | Módulo 11, dígito K, formatos inválidos y normalización. | Implementado en API/pruebas. |
| Validación de catálogos/filtros | Enum permitido, entradas desconocidas, fechas inválidas, límites y paginación. | Implementado. |
| Migración | Aplicar schema a una DB vacía; comparar SQL migrado y `db/schema.sql`; probar down en DB desechable. | Up y equivalencia implementados/probados; rollback debe agregarse a CI. |
| Integración API + PostgreSQL | Login/logout/me; 401 genérico; alta; privacidad en lista/detalle; transición; historial; 404/409. | Implementado con Supertest y PostgreSQL local. |
| Seguridad | Rate limit, cookies, bcrypt/JWT, SQL parametrizado, secretos y RUT fuera de logs. | Cobertura básica implementada; falta análisis de seguridad externo/penetración. |
| Auditoría de Casa Central | Resultados OK/HTTP/timeout/red; número correlativo, inmutabilidad y detalle sanitizado. | Pruebas unitarias de mock/auditoría; worker real pendiente. |
| Dashboard/KPI | Fórmulas, zona horaria, cohorte de fecha, denominadores cero y filtros. | Implementado y cubierto por pruebas; revisado localmente en navegador con datos sintéticos. No reemplaza validación de metas con Jefatura. |
| Fotos | 0–3 archivos, tamaño 2 MB, MIME, nombres seguros, S3 privado, URL y autorización. | Pendiente; restricciones están parcialmente en esquema. |
| PWA/usabilidad | Formulario de reporte JSON, login Jefatura, cola, filtros, detalle e historial en navegador móvil/escritorio; QR en Android/iOS, cámara, teclado, accesibilidad, errores y reintento de red. | Recorrido local de los flujos principales completado en navegador con datos sintéticos. QR gráfico, fotos, pruebas amplias de accesibilidad/dispositivos y manejo offline siguen pendientes. |
| Rendimiento/carga | Pico estimado, p95, pool, conexión RDS y límites. | Pendiente de volumen acordado y ambiente parecido a producción. |
| Resiliencia/DR | Caída de AZ/DB, restauración, DNS/deploy rollback, RTO/RPO demostrados. | Pendiente de infraestructura y simulacro. |
| Aceptación usuario | Operario reporta en menos de objetivo acordado; Jefatura gestiona cola y KPI; cliente firma UAT. | Aceptación visual técnica local del recorrido principal completada; no hubo UAT con Mallplaza ni firma de cliente, y no hay meta de tiempo validada. |

### Estrategia de ejecución

1. `npm run lint` y `npm test` por cada entrega backend.
2. PostgreSQL desechable para migraciones y pruebas integración; no usar datos productivos.
3. Ejecutar en CI en cada PR; reportar cobertura por módulo, no confundir porcentaje con calidad.
4. Para UAT, usar datos ficticios, casos por prioridad, errores de red y revisión de Jefatura/operario.
5. Bloquear release si falla una regla crítica, aparece RUT/secretos en logs, la integridad de transición no se cumple o se pierde trazabilidad.

## 2. Normas, estándares y controles

| Norma/guía | Aplicación y justificación | Estado |
|---|---|---|
| Ley Chile 21.719 / protección de datos personales | El RUT es dato personal. Definir finalidad, base de tratamiento, transparencia, minimización, acceso, retención, seguridad y ejercicio de derechos con el responsable legal. La BCN indica entrada en vigencia el 01-dic-2026; el proyecto debe diseñarse para cumplirla desde el lanzamiento y revisar el texto vigente con asesoría institucional. | Principios técnicos incorporados parcialmente; evaluación legal, aviso y retención pendientes. |
| OWASP Top 10 y OWASP ASVS (verificar edición vigente al congelar diseño) | Guían validación, autenticación, control de acceso, manejo de errores, configuración, sesiones, integridad de datos y pruebas de seguridad. No reemplazan pentest ni certifican por sí solas. | Mitigaciones iniciales; checklist de verificación pendiente. |
| ISO/IEC 27001/27002 (sistema y controles de seguridad) | Marco para riesgos, acceso, activos, incidentes, proveedores, continuidad y control de cambios. Se usa como referencia de control, no se afirma certificación. | Controles de código básicos; SGSI/certificación fuera del alcance académico inicial. |
| ISO/IEC 25010 (calidad del producto) | Estructura requisitos no funcionales en seguridad, confiabilidad, rendimiento, mantenibilidad, compatibilidad/usabilidad. Facilita convertir adjetivos en KPI/SLO verificables. | Criterios propuestos; baseline de rendimiento y usabilidad pendientes. |
| TLS 1.2 o superior | Protege datos en tránsito entre móvil, API, RDS e integración. HTTPS obligatorio en diseño productivo. | No existe despliegue productivo que validar. |
| OWASP API Security | Complementa controles de autorización por objeto, autenticación, consumo de recursos, configuración y exposición de datos en endpoints. | Rate limit, validación y autorización Jefatura parcial; revisar todos los endpoints previo a producción. |
| Accesibilidad WCAG 2.2 AA (objetivo de interfaz) | Formulario QR debe ser operable con teclado/lector, etiquetas/contraste y mensajes entendibles. Es relevante para operarios con dispositivos diversos. | PWA local implementada; auditoría formal y pruebas con tecnologías de asistencia pendientes. |
| Convención Conventional Commits / PR | Hace cambios auditables y facilita revisión grupal y rollback. | Aplicada en los commits del repositorio compartido; aún sin pull requests. |

La mención de norma no implica auditoría ni conformidad certificada. Antes de entrega académica, citar edición exacta/fecha de consulta de estándares en bibliografía formal y validar con el docente cuál espera el curso.

## 3. Catálogo de servicios TI asociado

| Servicio/producto | Usuario | Dependencia | Responsable propuesto |
|---|---|---|---|
| Captura pública de incidencia | Operario | PWA, HTTPS, API, PostgreSQL | Equipo de aplicación |
| Gestión de cola y cierre | Jefatura | Auth, API, DB | Equipo de aplicación / Jefatura |
| Persistencia y auditoría | Operación/soporte | RDS PostgreSQL, backups | Operaciones TI |
| Evidencias fotográficas | Operario/Jefatura | PWA, validación, S3 privado | Equipo aplicación + cloud TI |
| Dashboard y KPI | Jefatura | API de métricas, Chart.js, DB | Equipo de aplicación |
| Integración Casa Central | Sistemas internos | Worker, red, credenciales y especificación técnica del conector | Equipo integración + Casa Central |
| Identidad/secrets/monitoreo | Soporte TI | IAM, Secrets Manager, CloudWatch | Operaciones/seguridad |

El soporte debe acordar horario, canal, severidad, tiempo de respuesta, comunicación a usuarios, responsable de escalamiento y mantenimiento. El equipo de desarrollo no debe asumirse como mesa de ayuda 24/7 sin decisión y capacidad explícita.

## 4. Continuidad: prevención y recuperación

### Procedimientos proactivos

1. **Redundancia:** desplegar app en varias AZ, balanceador y health checks; usar RDS Multi-AZ cuando el SLA/costo lo apruebe.
2. **Backups:** habilitar backups automáticos/PITR y snapshot antes de cambios de esquema; definir retención y cifrado. Replicar/exportar objetos S3 según política aprobada.
3. **Protección de cambios:** migraciones revisadas, backwards compatible cuando sea posible, prueba en staging, aprobación, ventana y plan de rollback.
4. **Monitoreo:** probes de `/health`, latencia/error rate, pool/conexiones, CPU/storage, antigüedad de pendientes, errores de sync y cuota/errores S3; alarmas con responsables.
5. **Seguridad preventiva:** revisión de dependencias, rotación de secretos, IAM mínimo, parches, logs con redacción y prueba de permisos.
6. **Documentación:** inventario de dependencias, runbooks, contactos, mapa de datos y pasos de despliegue/restauración.
7. **Ensayos:** restauración de DB y despliegue rollback al menos semestralmente o según política institucional. Registrar evidencia y tiempos.

### Procedimiento reactivo ante interrupción grave

1. Registrar incidente operativo con hora, servicios afectados, impacto, responsable y severidad; activar canal de crisis y comunicar a Jefatura.
2. Contener: detener despliegue/proceso defectuoso, limitar accesos comprometidos, proteger evidencia y evitar reintentos externos duplicados.
3. Diagnosticar desde logs/CloudWatch sin extraer secretos ni publicar RUT; clasificar si afecta app, red, DB, S3, credenciales o Casa Central.
4. Recuperar servicio: failover de app/DB si está configurado; rollback de aplicación; restaurar snapshot/PITR en entorno aislado si hay corrupción; validar esquema, conteos, historial y auditoría antes del retorno.
5. Reanudar integraciones de manera idempotente; revisar `PENDIENTE_SINC` y evitar duplicar órdenes externas. Si el identificador/idempotency key definido por la interfaz no permite confirmar el resultado, pausar reenvío y conciliar manualmente con Casa Central.
6. Validar `/health`, autenticación, alta de prueba controlada, consulta y transición; liberar gradualmente y monitorear.
7. Comunicar estado y recuperación; luego hacer postmortem sin culpa, causa raíz, impacto, acciones/owners y fechas.

### RTO y RPO

Como metas iniciales de discusión se propone **RTO ≤4 h** (recuperar el servicio) y **RPO ≤15 min** (máxima pérdida de datos). La instalación actual no garantiza estos valores. Solo se podrán declarar si backups/PITR, redundancia, monitoreo y simulacros demuestran el resultado.

## 5. Gestión de configuración, cambios e incidentes

### Control de configuración

- Mantener inventario de componentes, versiones, entornos, variables, secretos, esquema y recursos AWS.
- Versionar código, migraciones, Docker Compose y documentación; secretos solo en almacén dedicado.
- Separar desarrollo/pruebas/staging/producción, sus bases, cuentas y credenciales.
- Cada liberación etiqueta commit, versión, migración aplicada, responsable y resultado.

### Cambios a código y entregables

1. Abrir issue con problema/criterios de aceptación, riesgo, impacto de datos/seguridad y dueño.
2. Crear rama desde `develop` en repo compartido; implementar cambio acotado y tests.
3. Actualizar API, diccionario, diagramas y decisiones afectadas junto al código.
4. Ejecutar lint/tests/migraciones, revisión de otro integrante y análisis de seguridad si toca auth/datos/infra.
5. Aprobar PR, desplegar primero a staging, observar métricas; tener rollback y aprobación de release.
6. Confirmar aceptación y cerrar issue con evidencia. Cambios urgentes se documentan retroactivamente y se revisan en 24 h.

### Gestión de incidentes TI

Clasificación inicial sugerida: **P1** caída total, posible fuga de datos o pérdida de persistencia; **P2** función crítica degradada o sync detenido; **P3** fallo parcial con alternativa manual; **P4** consulta/mejora. Registrar fecha, impacto, sistemas, evidencia sanitizada, workaround, escalamiento, actualización a interesados, resolución y revisión posterior. Tiempos de respuesta/actualización quedan por acordar con cliente.

## 6. Plan adaptativo por fases

La opción recomendada para un equipo estudiantil es trabajar por incrementos con revisión semanal y criterios de salida por fase. Fechas abajo son relativas (semanas), no fechas comprometidas.

| Fase | Duración referencial | Entregable / criterio de salida | Dependencias |
|---|---:|---|---|
| 0. Alineación y repositorio | 0,5 semana | Historias, alcance, repo Git/PR, dueños, riesgos, contrato y términos pendientes registrados. | Equipo y docente/cliente. |
| 1. Base backend Sprint 1 | 1,5 semanas | API, DB/migración, prioridad, auth, transiciones y pruebas verdes. | Schema y reglas acordadas. |
| 2. PWA/formulario/QR | 1,5 semanas | Flujo móvil validado con usuario; accesibilidad y errores; aceptación operario. | Catálogos, UX y hosting. |
| 3. Evidencias | 1 semana | Upload seguro 0–3, S3 privado, límites, metadatos, acceso y borrado/retención. | Credenciales, política de retención. |
| 4. Dashboard/KPI | 1 semana | KPI definidos y reconciliados con muestras; filtros y vistas para Jefatura. | Aprobación de fórmulas/umbrales. |
| 5. Sync Casa Central | 1–2 semanas | Conector parametrizado, worker idempotente, reintentos, auditoría y conciliación. | Coordinación de integración, entorno de validación y soporte técnico. |
| 6. Hardening y UAT | 1 semana | Carga, seguridad, UAT, runbooks, restauración de backup y defectos críticos cerrados. | Infra staging y usuarios disponibles. |
| 7. Despliegue/piloto | 0,5–1 semana | Producción/piloto, monitoreo, capacitación y aprobación de operación. | Presupuesto, DNS, IAM, SLA firmado. |

Duración orientativa total: 7–9 semanas de trabajo secuencial con equipo pequeño, sujeta a disponibilidad y simultaneidad. Casa Central puede determinar la ruta crítica. Para informe predictivo se puede reexpresar estas fases como Gantt tras conocer integrantes, horas y fecha límite; no asignar fechas ficticias.

## 7. Adecuación del cronograma

El plan entrega primero persistencia, prioridad y estados, porque esas reglas sostienen la trazabilidad y pueden probarse sin UI ni contrato externo. Luego habilita canal móvil y evidencia; después los KPI dependen de datos reales y definiciones aceptadas. La integración se ubica tras el contrato/sandbox, ya que desarrollarla antes implicaría inventar payloads y arriesgar duplicados. Hardening/UAT preceden al piloto para probar seguridad, rendimiento y restauración con operación real.

La planificación resuelve el problema por incrementos demostrables: cada fase entrega un flujo útil y verificable. Debe revisarse semanalmente contra historias completadas, defectos críticos, bloqueos externos y disponibilidad del equipo. Si la fecha de título es menor, priorizar MVP de reporte y gestión con mock explícito y documentar integración y despliegue como limitación, sin atribuirles cumplimiento de producción.

## Bibliografía breve / fuentes oficiales

- Biblioteca del Congreso Nacional de Chile, [Ley 21.719 — modifica el marco de protección de datos personales](https://www.bcn.cl/leychile/Navegar/imprimir?idNorma=1209272) (vigencia indicada: 1 de diciembre de 2026; consulta 09-10-2026).
- AWS, [Elastic Beanstalk — arquitectura y servicios asociados](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/AWSHowTo.html) y [diseño para tolerancia a fallas](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/concepts.concepts.design.html).
- OWASP, [Top 10](https://owasp.org/www-project-top-ten/) y [Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/).
