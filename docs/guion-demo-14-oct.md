# Guion de exposición y demo — 14 de octubre de 2026

Complementa `guion-demostracion-local.md` (que es la prueba técnica de aceptación). Este documento es para **presentar**.

> **Supuestos que debes confirmar:** no conozco la duración ni la pauta de la exposición; el guion está pensado para unos 10 minutos. Los repartos de voz son una sugerencia. Todo lo demás sale de los documentos del repositorio.

## 1. Calendario de preparación

| Día | Qué debe quedar listo |
|---|---|
| Sáb 10 | T1 (limpieza de Git y CI) y T3 (decisión sobre ubicaciones/QR). Mensaje a Mauricio con la lista de ubicaciones (T2) |
| Dom 11 | T4 y T5 si se aprobó la propuesta. Si no, pulir lo que ya existe |
| Lun 12 | **Congelar funcionalidades** al final del día. Primer ensayo completo con cronómetro; anotar todo lo que falle |
| Mar 13 | Segundo ensayo en el equipo de exposición con celular real. Grabar un video de 3 minutos de la demo (plan B). Dejar una etiqueta Git `demo-14-oct` en el commit que se presenta |
| Mié 14 | Checklist de la sección 4, 60 minutos antes |

## 2. Estructura (≈10 min)

| Min | Bloque | Contenido | Sugerido |
|---|---|---|---|
| 0–1,5 | Problema y alcance | Reportar fallas operativas en Mallplaza Copiapó y darles seguimiento; alcance acotado de una plataforma amplia a un sistema de incidencias | Benjamín |
| 1,5–3,5 | Decisiones de diseño | Prioridad por reglas deterministas (tabla de verdad, sin ML); estados `PENDIENTE → EN_PROCESO → RESUELTA` solo hacia adelante; QR por sector (propuesta) | Benjamín / Luis |
| 3,5–7,5 | **Demo en vivo** | Ver sección 3 | Luis |
| 7,5–8,5 | Lo que no está (decirlo tú primero) | Casa Central es un mock; fotos y AWS pendientes; los datos son ficticios; el esquema es una propuesta, no validado por Mallplaza | Jorge |
| 8,5–10 | Cierre | Qué sigue, qué se necesita del cliente (ubicaciones, contrato de Casa Central) | Jorge |

## 3. Demo en vivo (4 minutos)

**Preparación recomendada:** el guion técnico pide conservar los registros #1 y #2 de `mallplaza_dev`, lo que obliga a no enviar nada en vivo. Para poder crear una incidencia ante el público sin tocar esa base, levantar un proyecto Compose separado con base limpia:

```bash
docker compose -p mallplaza-demo up --build -d
docker volume ls | grep mallplaza-demo    # confirmar que usa un volumen propio
```

No correr ambos proyectos a la vez (usan los mismos puertos). Nunca usar `down -v` en el proyecto con los datos que se quieren conservar.

| Paso | Qué haces | Qué se debe ver | Frase clave |
|---|---|---|---|
| 1 | Abrir `http://localhost:5173/#/report` en ventana privada | Formulario público | "El operario no elige la prioridad; la calcula el sistema" |
| 2 | Enviar: RUT sintético `11111111-1`, Alto tránsito, Eléctrica, impacto operativo Sí, riesgo No, terceros No | Confirmación con ID, prioridad `CRITICA`, estado `PENDIENTE`, **sin RUT** | "Impacto operativo en alto tránsito es la primera regla, por eso es Crítica" |
| 3 | Iniciar sesión como Jefatura (credenciales ficticias de `docs/ejecucion-local.md`) | Cola con el caso | "Solo Jefatura gestiona" |
| 4 | Abrir el detalle y pasar a `EN_PROCESO`, luego a `RESUELTA` | Historial con ambos cambios; KPI actualizados (hasta 10 s de espera) | "El sistema impide saltarse el estado intermedio" |
| 5 | Mostrar KPI: MTTR, SLA, vencidas | Valores o `—` si no hay resueltas | "Los objetivos SLA son propuestas documentadas, no compromisos del cliente" |
| 6 | (Opcional) Modal "QR móvil" y escanear con el celular | Se abre la app en el celular | Solo si la red lo permite; si no, saltar |

Si se aprobó la propuesta de ubicaciones: en el paso 1, ingresar un código `DEMO` y mostrar que el lugar queda precargado.

## 4. Checklist

**60 minutos antes**
- [ ] Notebook cargado; segundo equipo con el repo clonado y probado
- [ ] `docker compose -p mallplaza-demo up --build -d` y `GET /health` responde
- [ ] Login de Jefatura funciona; cerrar sesión y volver a entrar
- [ ] Ventana privada abierta en el formulario; zoom del navegador legible desde lejos
- [ ] Video de respaldo abierto y probado con audio apagado
- [ ] Sin notificaciones, sin pestañas personales, sin credenciales visibles

**Si vas a usar el celular**
- [ ] Notebook y celular en la **misma red**. Las redes de instituciones suelen aislar dispositivos entre sí: llevar el hotspot de un celular como alternativa
- [ ] El QR se escaneó en iPhone y Android reales. Ninguno de los documentos registra esa prueba: el último paso anotado era "probar con el iPhone 13"
- [ ] Recordar que la cámara dentro de la PWA no funciona por HTTP en la red local (ver `propuesta-ubicaciones-qr.md`)

## 5. Plan B

| Si falla… | Haces… |
|---|---|
| Docker o la base | Pasar al video de 3 minutos y comentar en vivo; explicar que se grabó el día anterior |
| La red del lugar | Hotspot del celular |
| El celular o el QR | Mostrar la app en el notebook; el QR es un extra, no el eje de la demo |
| Un paso de la demo | No improvisar arreglos; decir "esto lo dejamos documentado" y seguir |

## 6. Preguntas probables y respuestas guía

| Pregunta | Respuesta guía (basada en los documentos del repo) |
|---|---|
| ¿Por qué reglas fijas y no machine learning? | La prioridad debe ser explicable y auditable; es una tabla de verdad con cuatro condiciones en orden, probada automáticamente. No se declaró IA/ML en el alcance |
| ¿De dónde sale el modelo de datos? | Borrador inicial elaborado con apoyo de IA, revisado y justificado en `docs/justificacion-modelo-datos.md`. No es un modelo entregado ni aprobado por Mallplaza. Conviene que quien presente pueda explicar cada tabla |
| ¿Qué pasa si Casa Central no responde? | El alta no espera: responde 201 y deja `PENDIENTE_SINC`. Hoy la conexión es un mock; el contrato real aún no existe |
| ¿Cómo se protege el RUT? | Se valida con módulo 11, no se registra en logs ni en respuestas públicas; solo el detalle autenticado lo muestra. Su visibilidad requiere validación del responsable de datos |
| ¿Y la seguridad? | Contraseñas con bcrypt (costo 12), cookie httpOnly con SameSite Strict, límite de intentos en login y alta, consultas parametrizadas |
| ¿De dónde salen los tiempos de SLA? | Son propuestas: Crítica 240, Alta 480, Media 1440, Baja 4320 minutos. No son compromisos del cliente |
| ¿Qué falta para producción? | Fotos, sincronización real, despliegue AWS, respaldo/recuperación, pruebas con usuarios, definición de ubicaciones y política de datos |
| ¿Quién hizo qué? | Responder con honestidad según el reparto real. Los 15 commits actuales son de Luis; conviene que el reparto del plan de trabajo ya esté reflejado en PRs antes del 14 |
| ¿Usaron IA para programar? | Si la institución exige declararlo, declararlo. Los documentos del repo ya lo reconocen; el criterio es poder explicar y defender lo entregado |
