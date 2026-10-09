# Documentación del proyecto

## Sistema de Gestión y Trazabilidad de Incidencias — Mallplaza Copiapó

Esta documentación sirve como memoria técnica y como base de coordinación del trabajo grupal. Distingue tres estados para no presentar una propuesta como si ya estuviera construida:

- **Implementado (Sprint 1):** existe en el repositorio y está cubierto por pruebas.
- **Diseño propuesto:** arquitectura o procedimiento recomendado para completar la solución; requiere aprobación del equipo/cliente y todavía no se ejecuta en producción.
- **Pendiente de definición:** depende de información que el cliente o Casa Central aún no entrega.

## Lectura recomendada

1. [Informe consolidado](informe-proyecto.md): documento principal con avance, alcance estable/adaptable y anexos técnicos para el informe académico.
2. [Estado vivo del proyecto](estado-proyecto.md): contexto breve para retomar programación en cada sesión.
3. [Justificación del modelo de datos](justificacion-modelo-datos.md): explicación didáctica del esquema y guía de defensa oral.
4. [Bitácora Sprint 1](bitacora-sprint-1.md): qué se construyó, archivos, razones, pruebas y límites.
5. [Selección de tecnologías](seleccion-tecnologias.md): comparación cualitativa/cuantitativa, herramientas y recursos.
6. [Procesos, UML y arquitectura](procesos-y-arquitectura.md): procesos BPMN conceptuales, casos de uso, componentes, topología e infraestructura.
7. [Datos, KPI y SLA](datos-kpi-sla.md): modelo relacional, diccionario, indicadores y niveles de servicio.
8. [Calidad, operación y planificación](calidad-operacion-plan.md): plan de pruebas, estándares, continuidad, cambios y fases.
9. [Contrato API Sprint 1](api.md) y [Preguntas abiertas](preguntas.md) para el equipo técnico.

## Alcance real a la fecha

El Sprint 1 implementa la base del backend: API Express, autenticación de Jefatura, validación y cálculo determinista de prioridad, registro de incidencias, consulta/listado y avance de estados, modelo/migración PostgreSQL, helper de auditoría y pruebas automatizadas. La integración se representa con un **mock local** y el alta deja la incidencia en `PENDIENTE_SINC`; no existe aún un worker que entregue órdenes a Casa Central.

El esquema contempla evidencias y políticas SLA, pero no están terminados el formulario PWA, carga real de fotos/S3, dashboard/KPI API, proceso automático de reintentos, despliegue AWS ni recuperación ante desastre ensayada. Los diagramas de estos componentes describen el diseño objetivo y los identifican como pendientes.

## Criterio para completar el informe grupal

Los puntajes tecnológicos, metas SMART, disponibilidad, RTO/RPO y calendario de fases son propuestas documentadas para discusión; no son compromisos del cliente. Deben validarse con la contraparte, el docente y los demás integrantes antes de presentarlos como baselines aprobados.
