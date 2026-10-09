# Documentación del proyecto

## Sistema de Gestión y Trazabilidad de Incidencias — Mallplaza Copiapó

Esta documentación sirve como memoria técnica y como base de coordinación del trabajo grupal. Distingue tres estados para no presentar una propuesta como si ya estuviera construida:

- **Implementado (Sprint 1):** existe en el repositorio y está cubierto por pruebas.
- **Diseño propuesto:** arquitectura o procedimiento recomendado para completar la solución; requiere aprobación del equipo/cliente y todavía no se ejecuta en producción.
- **Pendiente de definición:** depende de información que el cliente o Casa Central aún no entrega.

El informe consolidado editable se mantiene en Markdown y también se entrega como Word para revisión académica: [Informe de proyecto en Word](informe-proyecto.docx). Los diagramas Mermaid y PlantUML se incluyen como fuentes textuales para conservar su edición; si la pauta exige figuras BPMN/UML exportadas, deben renderizarse y anexarse como imágenes.

## Lectura recomendada

1. [Traspaso de contexto para Antigravity](HANDOFF-ANTIGRAVITY.md): resumen técnico, evidencias, pendientes, Git y prompt para retomar.
2. [Informe consolidado](informe-proyecto.md): documento principal con avance, alcance estable/adaptable y anexos técnicos para el informe académico.
3. [Estado vivo del proyecto](estado-proyecto.md): contexto breve para retomar programación en cada sesión.
4. [Justificación del modelo de datos](justificacion-modelo-datos.md): explicación didáctica del esquema y guía de defensa oral.
5. [Bitácora Sprint 1](bitacora-sprint-1.md): qué se construyó, archivos, razones, pruebas y límites.
6. [Selección de tecnologías](seleccion-tecnologias.md): comparación cualitativa/cuantitativa, herramientas y recursos.
7. [Procesos, UML y arquitectura](procesos-y-arquitectura.md): procesos BPMN conceptuales, casos de uso, componentes, topología e infraestructura.
8. [Datos, KPI y SLA](datos-kpi-sla.md): modelo relacional, diccionario, indicadores y niveles de servicio.
9. [Calidad, operación y planificación](calidad-operacion-plan.md): plan de pruebas, estándares, continuidad, cambios y fases.
10. [Contrato API Sprint 1](api.md) y [Preguntas abiertas](preguntas.md) para el equipo técnico.
11. [Ejecución local](ejecucion-local.md): arranque de PostgreSQL, migración, seed ficticio, API, frontend y compilación.
12. [Guion de demostración local](guion-demostracion-local.md): escenario sintético, pasos, resultados esperados y aceptación visual local ya realizada.

## Alcance real a la fecha

El backend implementa API Express, autenticación de Jefatura, validación y cálculo determinista de prioridad, registro JSON de incidencias, consulta/listado, detalle/historial, transiciones y KPI, con PostgreSQL y migración. El frontend local implementa formulario JSON, login, cola, filtros, detalle, historial y vista KPI. La compilación PWA, lint, 27 pruebas backend y `npm audit` completo se registraron en verde; el recorrido visual local también se completó con datos sintéticos.

El esquema contempla metadatos de evidencias y políticas SLA. La carga de fotos, QR gráfico distribuible, worker/reintentos a Casa Central, despliegue AWS y recuperación ante desastre ensayada siguen pendientes. Los diagramas de esos componentes describen el diseño objetivo, no infraestructura implementada. La base local usada para la aceptación conserva los registros sintéticos #1 y #2; revisar el guion antes de volver a operar sobre ella.

## Criterio para completar el informe grupal

Los puntajes tecnológicos, metas SMART, disponibilidad, RTO/RPO y calendario de fases son propuestas documentadas para discusión; no son compromisos del cliente. Deben validarse con la contraparte, el docente y los demás integrantes antes de presentarlos como baselines aprobados. La matriz de cierre del informe principal señala qué entregables están implementados, documentados, propuestos o bloqueados por dependencias externas.
