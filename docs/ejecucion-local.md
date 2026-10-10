# Ejecución local del prototipo

Esta guía levanta PostgreSQL, la API y el frontend de desarrollo con Docker Compose. Está pensada para datos ficticios y revisión académica; no es una instalación de producción.

## Requisitos

- Docker Engine con el plugin Docker Compose v2 (o Docker Desktop con integración WSL habilitada).
- No es necesario instalar Node.js ni npm en el equipo anfitrión para levantar la aplicación.

## Iniciar todos los servicios

Desde la raíz del repositorio, ejecuta:

```bash
docker compose up --build
```

Compose construye la API y el frontend, espera a que PostgreSQL esté saludable, ejecuta las migraciones y crea la cuenta ficticia de Jefatura antes de iniciar la aplicación. Vite espera a que la API responda en `/health`.

- Aplicación: `http://localhost:5173`
- API: `http://localhost:3000`
- Verificación: `http://localhost:3000/health`

Para dejar los servicios ejecutándose en segundo plano:

```bash
docker compose up --build -d
docker compose logs -f
```

Detener los contenedores, conservando los datos:

```bash
docker compose down
```

No usar `docker compose down -v` salvo que se quiera borrar deliberadamente el volumen local y todos sus datos. La base local que se usó para la aceptación visual puede conservar las incidencias sintéticas #1 y #2.

## Cuenta de demostración

Por defecto se crea una cuenta ficticia:

- Email: `jefatura@example.test`
- Password: `LocalDemo-2026-Only!`

Estos valores y la clave JWT predeterminada son solo para el perfil local desechable. No usar información real, contraseñas reutilizadas ni reportes operativos. Para personalizar la cuenta, configura `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` y, opcionalmente, `SEED_ADMIN_NOMBRE` en el archivo `.env` local (ignorado por Git) antes del primer seed. La semilla no sobrescribe una cuenta existente con el mismo correo.

La base usa el volumen `mallplaza-postgres` y mantiene `mallplaza_dev` y la base de pruebas local. Las migraciones se aplican en cada inicio de la API y no recrean la base.

## Desarrollo y compilación fuera de Docker

Para trabajar con hot reload ejecutando frontend/backend desde el anfitrión, sigue los pasos separados de instalación, variables de entorno y arranque definidos en `frontend/README.md` y los scripts npm de la raíz. La configuración de proxy de Vite conserva por defecto `127.0.0.1:3000`; Compose le asigna `http://backend:3000` dentro de la red Docker.

Para compilar el frontend fuera de Docker:

```bash
npm run build:frontend
```

## Límites

- Esta es una configuración de desarrollo local; no debe usarse en producción.
- No cargar RUT reales ni secretos del cliente.
- Fotos, almacenamiento S3, despliegue AWS y envío a Casa Central no forman parte del arranque local.
- `docker compose down` conserva los datos; `docker compose down -v` los elimina de manera irreversible.
- La suite automatizada del backend requiere su base de pruebas separada; seguir las instrucciones del backend y no apuntar pruebas a una base que se quiera conservar.
