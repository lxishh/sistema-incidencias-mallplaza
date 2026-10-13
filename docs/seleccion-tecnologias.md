# Selección y justificación de tecnologías

## 1. Método

La guía de proyecto fija Node.js 20, Express, PostgreSQL, Zod, bcrypt, JWT, Multer, Pino, Vite/PWA, Chart.js y AWS Elastic Beanstalk/RDS/S3. Por tanto, esta matriz **justifica y documenta la selección**, no autoriza a cambiar el stack. Se comparan alternativas razonables para explicar la decisión. Puntaje de 1 (débil) a 5 (muy favorable); resultado = suma de peso × puntaje / 5. Pesos y notas son una evaluación del equipo para discutir, no benchmark independiente.

## 2. Backend: comparación cualitativa/cuantitativa

| Criterio | Peso | Node 20 + Express | Python + Django REST | Java + Spring Boot |
|---|---:|---:|---:|---:|
| Ajuste a equipo/stack definido | 25% | 5 | 2 | 2 |
| Velocidad para API y MVP | 20% | 5 | 4 | 3 |
| Ecosistema y mantenimiento | 15% | 4 | 4 | 5 |
| Integración con PWA y JSON | 15% | 5 | 4 | 4 |
| Control explícito del diseño | 10% | 4 | 3 | 3 |
| Facilidad de despliegue AWS | 10% | 4 | 4 | 4 |
| Curva/costo de operación inicial | 5% | 4 | 4 | 2 |
| **Resultado ponderado** | **100%** | **92/100** | **68/100** | **65/100** |

**Por qué Express:** el equipo ya estableció Node y Express; el modelo HTTP JSON, su ecosistema de pruebas y la reutilización de JavaScript entre frontend/backend reducen la fricción del MVP. Express deja decisiones de estructura y validación en manos del equipo, por lo que se agregan módulos explícitos (Zod, middleware de auth, reglas puras, servicios). Django/Spring son opciones válidas, pero su cambio aumenta aprendizaje y divergencia sin resolver una necesidad demostrada en este alcance.

## 3. Base de datos: comparación

| Criterio | Peso | PostgreSQL | MySQL | MongoDB |
|---|---:|---:|---:|---:|
| Integridad relacional, FK, CHECK y triggers | 30% | 5 | 4 | 2 |
| Consultas SQL y agregaciones KPI | 25% | 5 | 4 | 3 |
| Tipos y restricciones útiles al dominio | 15% | 5 | 4 | 3 |
| Operación administrada en AWS | 15% | 5 | 5 | 4 |
| Ajuste al esquema aprobado | 15% | 5 | 3 | 2 |
| **Resultado ponderado** | **100%** | **100/100** | **80/100** | **54/100** |

**Por qué PostgreSQL:** el esquema ya depende de enums, checks, triggers, funciones PL/pgSQL, claves foráneas y consultas de fecha/KPI. Migrar a documental o cambiar dialecto agrega riesgo y reescritura, mientras que el dominio es relacional y debe preservar historial auditable.

## 4. Frontend y gráficos

| Opción | Ventaja para esta solución | Costo/riesgo | Decisión |
|---|---|---|---|
| Vite + PWA | Build rápido, despliegue estático, experiencia instalable y buena respuesta en móvil | Equipo implementa accesibilidad, formularios y estrategia offline | Seleccionado por stack |
| Next.js | SSR/routing integrado y ecosistema amplio | SSR no es requisito para formulario interno/QR; operación más compleja | No seleccionado para MVP |
| Chart.js | Gráficos convencionales para KPI y dashboard | Personalización avanzada manual | Seleccionado por stack |
| ECharts | Amplia variedad de visualizaciones | Más capacidades que las necesarias al inicio | Alternativa no adoptada |

El frontend Vite/PWA sí está implementado como prototipo local: formulario de reporte JSON, ingreso Jefatura, cola, filtros, detalle/historial y panel KPI. No carga fotografías ni genera un QR gráfico distribuible. El build local produce manifest y service worker; esto no equivale a publicación ni operación en AWS.

## 5. Plataforma de ejecución y servicios TI

| Capa | Selección | Alternativa considerada | Justificación |
|---|---|---|---|
| Runtime/API | Node.js 20 + Express | Framework con servidor incluido | Compatible con stack y API REST sin ORM. |
| Validación | Zod | Joi / validación manual | Esquemas declarativos cercanos a JavaScript, errores estructurables. |
| Acceso a datos | `pg` con SQL parametrizado | ORM | SQL explícito y esquema de referencia; evita duplicar abstracciones y mantiene control de queries. |
| Migraciones | node-pg-migrate | SQL aplicado manualmente | Historial reproducible y rollback; el contenido sigue procediendo del schema oficial del proyecto. |
| Contraseñas | bcrypt cost 12 | texto claro / hash rápido | Hash de contraseña adaptativo; texto claro y hashes generales no son aceptables para credenciales. |
| Sesión | JWT en cookie segura | token en `localStorage` / sesión de servidor | Reduce exposición a scripts; 8 h, `httpOnly`, `SameSite=Strict`. Revisar CSRF junto con cualquier cambio de origen/cookie. |
| Logs | Pino | `console.log` | Logs estructurados y redacción explícita de secretos y RUT. |
| Pruebas | Vitest + Supertest | pruebas manuales solamente | Unitarias y HTTP repetibles, integración real con PostgreSQL. |
| Datos local | PostgreSQL 15+ en Docker Compose | DB compartida de desarrollo | Reproduce el motor y aísla `mallplaza_test`. |
| Producción propuesta | Elastic Beanstalk + RDS + S3, HTTPS | VPS/instancia única | Servicios administrados y alineados al diseño de referencia; operación productiva pendiente. |

## 6. Herramientas, equipos y conectividad

### Desarrollo (mínimos recomendados para el equipo)

- Notebook/PC de 4 núcleos, 8 GB RAM (16 GB recomendados), 10 GB libres, navegador moderno y conexión a Internet.
- Docker Desktop con backend WSL2 para PostgreSQL local; Node.js 20 y npm; editor de código; Git y cliente PostgreSQL para el trabajo grupal.
- Repositorio Git compartido con ramas/PR y revisión de código. El remoto `origin` publica una sola rama (`feature/S1-demo-qr`) y no hay pull requests abiertos; ver `docs/estado-proyecto.md`.

### Producción objetivo (sin dimensionamiento aún)

- Dispositivos móviles del operario con cámara y navegador moderno para lectura QR y envío del formulario.
- DNS y certificado TLS; balanceador/entrada HTTPS; instancias de cómputo en Elastic Beanstalk; RDS PostgreSQL en red privada; S3 privado para evidencias; CloudWatch para logs, métricas y alarmas; Secrets Manager/Parameter Store para credenciales.
- VPC, subredes, security groups, IAM de mínimo privilegio, backup y monitoreo. No se ha elegido tipo de instancia, región, tamaño de RDS, retención ni presupuesto: deben determinarse con carga, disponibilidad, retención y costo acordados.

## 7. Evaluación y revisión

La ponderación favorece el ajuste a requisitos y esquema existentes. Conviene recalcular los puntajes con el equipo si cambian el tamaño del equipo, las capacidades de operación, el volumen, la disponibilidad o el contrato de Casa Central. La evaluación no debe usarse como afirmación de que una tecnología es universalmente superior.
