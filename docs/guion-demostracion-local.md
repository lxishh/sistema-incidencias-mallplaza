# Guion de demostración y aceptación local

**Versión:** 1.0 — 9 de octubre de 2026

**Propósito:** repetir una demostración académica con datos ficticios y distinguir los resultados ya verificados de las comprobaciones manuales aún pendientes.

## Alcance

El recorrido presenta el registro de una falla, su priorización determinista, la gestión por Jefatura y la consulta de indicadores. Utiliza PostgreSQL local y no envía información a AWS ni a Casa Central. No usar datos personales ni reportes operativos reales.

## Preparación

1. Seguir [Ejecución local](ejecucion-local.md) para iniciar PostgreSQL, API y Vite.
2. Verificar `GET /health` y que el usuario semilla ficticio se haya creado.
3. Abrir `http://localhost:5173/#/report` en una ventana privada o perfil limpio, para que la sesión de Jefatura no cambie la pantalla inicial.
4. Confirmar que la base usada es local y descartable. En una exposición grupal, acordar antes quién conserva o limpia esos datos.

## Escenario sugerido

Según la aceptación visual reportada el 9 de octubre, `mallplaza_dev` conserva la incidencia sintética #1 y la #2 resuelta. Para la exposición final, reutilizar la #2 en la vista de Jefatura y mostrar sus métricas; no volver a enviarla desde el formulario ni limpiar la base. Si se necesita repetir todo el ciclo desde cero, usar una base descartable acordada por el equipo.

Si el equipo decide repetir el alta desde cero, debe hacerlo en una base descartable aislada, nunca en la base compartida de demo. Para ese caso aislado se puede usar el siguiente evento sintético:

| Campo | Valor de demostración |
|---|---|
| RUT | `11111111-1` (solo dato sintético) |
| Ubicación | Alto tránsito |
| Tipo de falla | Eléctrica |
| Impacto operativo | Sí |
| Riesgo de accidente | No |
| Afecta a terceros | No |
| Comentario | Prueba académica local; no corresponde a un evento real |

## Recorrido y resultados esperados

1. **Formulario público:** completar campos y enviar. Se espera confirmación con ID, prioridad `CRITICA` y estado `PENDIENTE`. La respuesta pública no debe mostrar el RUT. Si falta una respuesta Sí/No, el formulario debe pedir completarla.
2. **Justificación de prioridad:** `impacto_operativo = true` y `ubicacion = ALTO_TRANSITO` satisfacen la primera condición; por precedencia, el resultado es Crítica. `tipo_falla` no interviene en esa decisión.
3. **Inicio de sesión:** abrir Jefatura e ingresar con las credenciales ficticias configuradas localmente. No usar cuentas personales ni corporativas.
4. **Cola e indicadores:** localizar el ID creado. Verificar prioridad, tipo, ubicación y estado. Los KPI usan el rango de creación y consultan la política SLA guardada en la BD.
5. **Detalle:** revisar datos e historial. El detalle autenticado muestra RUT según el contrato actual; en una versión operativa, esta visibilidad requiere validación del responsable de datos.
6. **Transición:** avanzar primero a `EN_PROCESO`; volver al detalle y avanzar a `RESUELTA`. La BD/API debe impedir saltarse el estado intermedio. Una actualización exitosa refresca cola, detalle e indicadores.
7. **Cierre:** cerrar sesión. Limpiar datos solo en una base local descartable y según coordinación del equipo; no borrar el volumen compartido sin acordarlo.

## Criterios de aceptación

- El formulario explica errores de validación sin exponer información personal.
- La prioridad coincide con la tabla de verdad y puede justificarse a partir de los factores de entrada.
- Jefatura puede localizar, abrir y avanzar el caso; no puede resolverlo directamente desde `PENDIENTE`.
- El panel muestra KPI para el período; cuando el denominador no permite calcularlos, muestra `—`.
- Quien presenta identifica que sincronización real, fotos/S3 y despliegue AWS todavía no están terminados.

## Evidencia y estado

- **Automatizada:** lint aprobado, 27 pruebas aprobadas en 8 archivos; cubren alta, transición, autenticación, KPI, rangos y reglas.
- **API local aislada:** en una copia temporal independiente, un alta sintética devolvió HTTP 201, `CRITICA`, `PENDIENTE` y `PENDIENTE_SINC`, sin devolver el RUT. Esa copia se eliminó; esta comprobación no describe el contenido actual de `mallplaza_dev`.
- **KPI:** comprobados con datos sintéticos en una base temporal y revisados visualmente en el panel de gestión.
- **Aceptación visual completada — 2026-10-09:** en `localhost`, con PostgreSQL local y el commit `61b48e4` de `feature/S1-dashboard-kpis`, se registró el reporte sintético **#2**. La confirmación mostró prioridad `CRITICA` y estado `PENDIENTE`, sin mostrar el RUT. Jefatura lo localizó por ID, abrió el detalle y avanzó el historial `PENDIENTE → EN_PROCESO → RESUELTA`. La fila de la cola terminó como `Resuelta`; el panel se actualizó a 2 incidencias del período, 1 abierta y 1 resuelta, MTTR 0,8 min, SLA 100 % (1 de 1 dentro del objetivo) y 0 abiertas vencidas. La sincronización quedó `PENDIENTE_SINC`, como corresponde al mock. Se cerró sesión y la ruta de Jefatura volvió a pedir autenticación al recargar. La consola del navegador registró `ERR_ABORTED` en la petición de logout durante el cambio de vista; aunque la sesión no quedó disponible al recargar, conviene revisar ese evento en el siguiente pase de robustez.
- **Datos preexistentes preservados:** la cola también contenía la incidencia #1, que no se modificó. No se limpió la base compartida ni se guardó una captura; no se cargaron datos personales reales. La evidencia es el recorrido visual observado, no una prueba de usuario ni una validación de Mallplaza.
- **Logout — robustez de API:** la prueba automatizada comprueba que la ruta responde 204, expira `mallplaza_session` y el endpoint `/api/auth/me` rechaza la cookie vaciada. Esto verifica el contrato del servidor, pero no reproduce el `ERR_ABORTED` observado en la consola del navegador; la causa exacta del evento del navegador sigue sin determinar.

Al repetirlo, anotar fecha, versión/commit, ambiente, ID sintético, resultado por paso, captura autorizada y defectos observados. No registrar RUT reales en capturas.
