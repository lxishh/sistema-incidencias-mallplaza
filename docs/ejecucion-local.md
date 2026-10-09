# Ejecución local del prototipo

Esta guía levanta la API, PostgreSQL y el frontend de desarrollo en Ubuntu/WSL. Está pensada para datos ficticios y revisión académica; no es una instalación de producción.

## 1. Requisitos

- Ubuntu/WSL con Node.js 20 (20.19 o superior) y npm instalados en Linux.
- Docker Desktop iniciado y con integración habilitada para la distribución Ubuntu.
- En WSL, trabajar desde `/home/localdev/sistema-incidencias-mallplaza`; no instalar dependencias desde Git Bash, PowerShell ni una ruta `\\wsl.localhost`.

Verificar desde la terminal Ubuntu:

```bash
cd /home/localdev/sistema-incidencias-mallplaza
node --version
npm --version
docker version
```

## 2. Iniciar PostgreSQL

Desde la raíz del repositorio:

```bash
docker compose up -d postgres
docker compose ps
```

La base de desarrollo del Compose es `mallplaza_dev`, usuario `mallplaza`, puerto local `5432`. La contraseña incluida en `docker-compose.yml` es únicamente para la base descartable de desarrollo local; nunca se reutiliza en AWS.

## 3. Configurar entorno y preparar base de datos

Desde la raíz, se exportan variables en la terminal actual. Cambia la contraseña semilla por otra de prueba, de al menos 12 caracteres; no uses una contraseña personal o corporativa.

```bash
export NODE_ENV=development
export DATABASE_URL='postgres://mallplaza:mallplaza_dev@localhost:5432/mallplaza_dev'
export JWT_SECRET='desarrollo-local-reemplazar-por-una-frase-aleatoria-larga'
export REPORT_TZ='America/Santiago'
export SEED_ADMIN_EMAIL='jefatura@example.test'
export SEED_ADMIN_PASSWORD='LocalDemo-2026-Only!'
export SEED_ADMIN_NOMBRE='Jefatura Demo'
```

Aplicar migraciones y crear el usuario ficticio:

```bash
cd backend
npm ci
npm run db:migrate
npm run db:seed
```

Las variables existen solo en esta terminal y no se escriben en el repositorio. El seed es idempotente respecto del correo: no sobrescribe una cuenta ya existente.

## 4. Levantar backend

En la misma terminal, desde `backend/`:

```bash
node src/server.js
```

Debe indicar que escucha en el puerto `3000`. En una segunda terminal Ubuntu puede verificarse:

```bash
curl -i http://localhost:3000/health
```

## 5. Levantar frontend

En otra terminal Ubuntu:

```bash
cd /home/localdev/sistema-incidencias-mallplaza/frontend
npm ci
npm run dev
```

Abrir la dirección que informa Vite, habitualmente `http://localhost:5173`. El proxy de desarrollo redirige `/api` y `/health` al backend en el puerto `3000`. La PWA desactiva su service worker durante el modo de desarrollo para que no interfiera con las actualizaciones locales.

Credenciales de demostración: correo y contraseña configurados por `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` en el paso 3. La pantalla no consulta cuentas Mallplaza.

## 6. Compilar frontend

Detener Vite con `Ctrl+C` o abrir otra terminal Ubuntu:

```bash
cd /home/localdev/sistema-incidencias-mallplaza/frontend
npm run build
```

El resultado esperado es `frontend/dist/` con `index.html`, manifiesto y service worker. El modo de desarrollo es el camino de demo local descrito en esta guía; `preview` no incluye todavía un reverse proxy al backend.

## 7. Limpiar los datos de demostración

El volumen de PostgreSQL conserva datos al detener Compose. Para borrar completamente la base local y recrearla desde cero:

```bash
cd /home/localdev/sistema-incidencias-mallplaza
docker compose down -v
docker compose up -d postgres
```

Después repite los pasos 3 y 4. `down -v` elimina de manera irreversible solo el volumen de esta base local: usar únicamente si se desea descartar todos los datos ficticios.

## Limitaciones

- No cargar información real, RUT operativo ni secretos del cliente.
- Fotos, QR impreso, S3, despliegue AWS y envío a Casa Central no forman parte del arranque local actual.
- El endpoint KPI y su vista deben verificarse con casos de datos controlados; las metas SLA son propuesta del proyecto.
- Para pruebas automatizadas del backend se requiere una base de pruebas separada; no apuntar la suite a una base con información que se quiera conservar.
