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

Registrar un evento sintético con estos valores:

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
- **API local aislada:** un alta sintética devolvió HTTP 201, `CRITICA`, `PENDIENTE` y `PENDIENTE_SINC`, sin devolver el RUT. La base temporal se eliminó y `mallplaza_dev` quedó con cero incidencias.
- **KPI:** comprobados con datos sintéticos en una base temporal y revisados visualmente en el panel de gestión.
- **Pendiente de aceptación manual:** completar en navegador el envío del formulario, apertura del detalle y dos transiciones consecutivas. La evidencia HTTP y las pruebas automatizadas no sustituyen ese recorrido visual.

Al repetirlo, anotar fecha, versión/commit, ambiente, ID sintético, resultado por paso, captura autorizada y defectos observados. No registrar RUT reales en capturas.
