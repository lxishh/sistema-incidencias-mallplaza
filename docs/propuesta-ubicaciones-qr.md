# Propuesta: ubicaciones físicas y QR por sector

**Estado:** PROPUESTA, no implementada. Cambia `db/schema.sql`, por lo que requiere aprobación explícita (ver `AGENTS.md`, "Requiere revisión/aprobación").
**Fecha:** 10 de octubre de 2026

> **Actualización (10-oct-2026): esta propuesta es opcional.** El Informe 1 define la ubicación como tres niveles de tránsito que el operario elige de una lista, y RF-04 y RF-05 describen el QR como acceso al formulario y la zona como selección manual. El prototipo actual cumple esos requisitos. Un QR por sector con ubicación precargada cambiaría RF-04 y RF-05 y necesitaría acuerdo formal con el cliente (ver decisiones D3 y D4 en `docs/preguntas.md`).

## 1. Qué se decidió y qué hay hoy

| Tema | Decisión del proyecto | Estado actual del repositorio |
|---|---|---|
| Qué representa el QR | Un código por ubicación/sector; el QR guarda solo ese código, se imprime y no caduca | El QR de `npm run qr` y el modal "QR móvil" solo codifican la URL de la app (sirve para abrirla en el celular en la demo) |
| Dónde se escanea | Dentro de la PWA, no con la cámara nativa | No existe lectura de QR en la PWA. El último ajuste del QR buscó que lo lea la cámara nativa del iPhone |
| Formulario | Se abre con ubicación/sector precargado | `ubicacion` es un `select` de 3 valores: `ALTO_TRANSITO`, `TRANSITO_MEDIO`, `BAJO_TRANSITO` |
| Datos de lugares | Aún no hay lista de lugares del mall | No hay tabla de ubicaciones |

En resumen: `ubicacion` hoy es un **nivel de tránsito** (alimenta la regla de prioridad), no un **lugar físico**. Lo que distingue al sistema, reportar desde el lugar exacto sin escribirlo, todavía no existe. Tampoco se puede medir incidencias por sector real.

## 2. Modelo propuesto

Principio: **no se toca la regla de prioridad**. `incidencias.ubicacion` sigue existiendo, pero se deriva del sector cuando hay QR.

```sql
-- Migración NUEVA (no editar 20261009000100-initial-schema, que ya está aplicada)
CREATE TABLE ubicaciones (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo          varchar(16)  NOT NULL UNIQUE,      -- lo único que guarda el QR; opaco, no cambia
  nombre          varchar(120) NOT NULL,             -- p. ej. "Baño público, sector A"
  sector          varchar(60),                       -- agrupación para KPI (zona o piso)
  nivel_transito  ubicacion_transito NOT NULL,       -- alimenta la regla de prioridad
  activa          boolean      NOT NULL DEFAULT true, -- se desactiva en vez de borrar
  created_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_ubicaciones_codigo CHECK (codigo ~ '^[A-Z2-9]{8,16}$')
);

ALTER TABLE incidencias
  ADD COLUMN id_ubicacion bigint REFERENCES ubicaciones(id);
CREATE INDEX ix_inc_id_ubicacion ON incidencias (id_ubicacion);
```

Reglas:
- `id_ubicacion` es **nullable**: las incidencias sintéticas #1 y #2 y el modo "sin QR" siguen funcionando.
- Si el alta trae `codigo_ubicacion`, el servidor **ignora** la `ubicacion` enviada por el cliente y usa `nivel_transito`. Así no hay incoherencias.
- El código lo genera el servidor (aleatorio, sin caracteres ambiguos). No es secuencial para que no se pueda enumerar.
- Un QR dañado o perdido se revoca (`activa = false`) y se emite otro. "No caduca" significa que no vence por tiempo, no que sea irrevocable.

## 3. API propuesta

| Endpoint | Resultado |
|---|---|
| `GET /api/ubicaciones/:codigo` | 200 con `{ nombre, sector, ubicacion }`. 404 si no existe. 409 `UBICACION_INACTIVA` si fue desactivada |
| `POST /api/incidencias` | Acepta `codigo_ubicacion` opcional. Sin él, funciona como hoy (no rompe las 33 pruebas) |
| `GET/POST/PATCH /api/admin/ubicaciones` | Solo Jefatura: crear, listar, activar/desactivar |
| `GET /api/dashboard/kpis` | Se agrega `por_sector` |

## 4. Flujo en la PWA

1. El operario abre la PWA y toca "Escanear QR" (cámara dentro de la app).
2. Se lee el código, se consulta `GET /api/ubicaciones/:codigo` y se muestra el nombre del lugar.
3. El formulario se abre con la ubicación bloqueada; el resto de campos como hoy.
4. Jefatura imprime una hoja de QR por sector (reutiliza el generador existente; el contenido del QR pasa a ser el código, no una URL).

**Cómo leer el QR dentro de la PWA** (decisión pendiente):
- **API `BarcodeDetector` del navegador:** sin dependencias, pero el soporte es desigual entre navegadores. No lo verifiqué para iOS Safari; hay que probarlo en un iPhone antes de apostar por esto.
- **Librería JS de decodificación** (por ejemplo jsQR o ZXing): funciona en todos los navegadores, pero es una dependencia nueva y `AGENTS.md` exige aprobación para cambios de stack.
- **Ingreso manual del código:** debe existir siempre como respaldo. Sirve también si la cámara falla en plena demo.

**Cuidado con la demo:** los navegadores móviles solo dan acceso a la cámara en HTTPS o en `localhost`. La demo por IP de la red local (`http://192.168.x.x:5173`) **no podrá abrir la cámara** desde la PWA. Opciones: túnel HTTPS, certificado local (mkcert), escanear desde el notebook con webcam (`localhost` sí funciona), o ingreso manual del código.

## 5. Decisiones abiertas

1. **Lista real de ubicaciones y sectores** (Mauricio Maldonado). Hasta tenerla, la demo usa sectores ficticios marcados `DEMO`.
2. **Quién puede usar el QR.** Se decidió que solo funcione autenticado en la PWA, pero hoy existe solo el rol `JEFATURA` y el alta es pública con RUT en el formulario. ¿Habrá login de operario (nuevo rol, cambia el enum `rol_usuario`) o se mantiene alta pública con RUT? Afecta seguridad y la Ley 21.719.
3. **Librería de lectura de QR** (ver sección 4): requiere aprobación de stack.
4. **Histórico:** las incidencias previas quedan con `id_ubicacion` nulo.

## 6. Tareas y esfuerzo orientativo

S = hasta 2 h, M = medio día, L = cerca de un día. Ajustar según quién las tome.

| # | Tarea | Talla |
|---|---|---|
| 1 | Migración nueva, `schema.sql` y `justificacion-modelo-datos.md` | S |
| 2 | `GET /api/ubicaciones/:codigo` y `codigo_ubicacion` en el alta, con pruebas | M |
| 3 | Datos de demostración ficticios (13 ubicaciones `DEMO`, ya generadas; ver sección 8) | S |
| 4 | Formulario con ubicación precargada y campo manual de código | M |
| 5 | Administración de ubicaciones para Jefatura y hoja de QR imprimible | M |
| 6 | Escáner con cámara dentro de la PWA | M a L |
| 7 | KPI `por_sector` en API y panel | S |

Con 4 días hasta el 14-oct, lo realista es **1 + 2 + 3 + 4** (ubicación por código, con ingreso manual) y dejar 5, 6 y 7 como siguiente paso. Eso ya demuestra el concepto sin arriesgar la demo.

## 7. Si se aprueba

Actualizar `db/schema.sql`, crear la migración nueva (no editar la existente), `docs/justificacion-modelo-datos.md`, `docs/api.md` y el informe. Una pregunta que el profesor puede hacer: "¿por qué una tabla aparte en vez de ampliar el enum?". Respuesta: el enum es un atributo del lugar (nivel de tránsito), no el lugar; separar permite agregar sectores sin migrar tipos y medir por sector.

## 8. Datos de demostración (ficticios)

Mientras Mallplaza no entrega la lista real, se generaron 13 ubicaciones **inventadas**. Sus nombres son genéricos y se inspiran en lo que la prensa describió para este mall en 2014 (dos niveles, patio de comidas, cine, estacionamientos y servicios); **no corresponden a un plano real** y no están validadas por el cliente. Todas llevan el prefijo `[DEMO]` en la base.

Archivos:
- `db/seeds/ubicaciones-demo.sql`: `INSERT` listo para usar **después** de aplicar la migración propuesta. Validado contra `db/schema.sql` en una base de prueba: la tabla se crea, los 13 registros entran y un código inválido es rechazado.
- `docs/hoja-qr-ubicaciones-demo.html`: hoja imprimible con un QR por ubicación; cada QR contiene solo el código. Los 13 se decodificaron correctamente con OpenCV; falta la prueba con cámaras de celulares reales.
- `db/seeds/ubicaciones-demo.json` y `backend/scripts/generate-ubicaciones-demo.js`: fuente de los dos anteriores. Si se edita el JSON, volver a ejecutar `node backend/scripts/generate-ubicaciones-demo.js`.

| Código | Lugar | Sector | Tránsito |
|---|---|---|---|
| `N2Z6K4HRJM` | Acceso principal peatonal | Accesos | Alto |
| `S8LL7ZRNWY` | Pasillo central, nivel 1 | Nivel 1 | Alto |
| `F6TWH8U5FX` | Escaleras mecánicas centrales | Nivel 1-2 | Alto |
| `ET5WN4FYG8` | Patio de comidas, zona de mesas | Patio de comidas | Alto |
| `M2WM9XRWJR` | Baños del patio de comidas | Patio de comidas | Alto |
| `9N7CWLD3YN` | Hall de acceso al cine | Entretención | Medio |
| `F32MPDJDL2` | Servicio al cliente y cajeros | Nivel 1 | Medio |
| `A7QNHC9UZ2` | Pasillo de tiendas, nivel 2 | Nivel 2 | Medio |
| `3C8MSM3RPR` | Baños del nivel 2 | Nivel 2 | Medio |
| `BEQXUHTA5J` | Estacionamiento, acceso peatonal | Estacionamientos | Medio |
| `UKSMMJGEMS` | Estacionamiento, sector alejado | Estacionamientos | Bajo |
| `TJZYUMV3RC` | Andén de carga y descarga | Servicios internos | Bajo |
| `9CPW6695DS` | Pasillo de servicio y bodega de mantenimiento | Servicios internos | Bajo |

Cada nivel de tránsito permite mostrar una prioridad distinta en la demo. Por ejemplo, un fallo eléctrico con impacto operativo en *Baños del patio de comidas* (alto tránsito) da prioridad `CRITICA`, mientras que el mismo reporte en *Andén de carga y descarga* (bajo tránsito) da `MEDIA` (la regla 3: impacto operativo).
