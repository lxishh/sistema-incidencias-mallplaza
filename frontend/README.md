# Frontend local

Aplicación web con Vite y `vite-plugin-pwa`. La vista consume la API bajo el mismo origen `/api`; el servidor de desarrollo reenvía esas rutas por defecto a `http://127.0.0.1:3000`. Docker Compose establece el proxy interno a `http://backend:3000`.

## Requisitos e instalación

Usar Node.js 20 (20.19 o superior para Vite 7) y npm dentro de Ubuntu/WSL. Desde esta carpeta:

```bash
npm ci
```

No se debe reutilizar `node_modules` creado por Windows a través de la ruta UNC/WSL. El lockfile se conserva para fijar las versiones.

## Desarrollo

Con backend y PostgreSQL iniciados en `localhost:3000`:

```bash
npm run dev
```

Vite muestra la dirección local, normalmente `http://localhost:5173`. En desarrollo el service worker está desactivado para evitar que una caché antigua oculte cambios.

Para iniciar PostgreSQL, API y frontend juntos con Docker, consulta [`docs/ejecucion-local.md`](../docs/ejecucion-local.md).

## Compilación

```bash
npm run build
```

Genera `dist/`, manifiesto web, service worker y recursos estáticos. `dist/` se puede usar para una vista previa local:

```bash
npm run preview
```

## Alcance implementado y límites conocidos

- El formulario público envía JSON, no imágenes ni multipart.
- Jefatura puede iniciar sesión, filtrar/listar incidencias, revisar detalle e historial y avanzar el estado.
- La PWA precachea la interfaz; las rutas API no se guardan en caché.
- Los KPI se consultan desde `GET /api/dashboard/kpis` y se muestran en una vista de resumen con filtro de fechas.
- Casa Central sigue siendo una integración futura; los registros nuevos quedan con sincronización pendiente.
- No usar con RUT o información operativa real. Es una demostración académica local.
