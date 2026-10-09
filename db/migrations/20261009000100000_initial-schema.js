exports.up = (pgm) => {
  pgm.sql(String.raw`-- =====================================================================
-- Sistema de Gestión y Trazabilidad de Incidencias Operativas
-- Mallplaza Copiapó - PostgreSQL 15+ (Amazon RDS)
-- =====================================================================


CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- ENUMs (el orden de declaración de prioridad permite ORDER BY prioridad ASC
-- para obtener la cola con Crítica primero)
-- ---------------------------------------------------------------------
CREATE TYPE rol_usuario         AS ENUM ('JEFATURA');
CREATE TYPE ubicacion_transito  AS ENUM ('ALTO_TRANSITO', 'TRANSITO_MEDIO', 'BAJO_TRANSITO');
CREATE TYPE tipo_falla          AS ENUM ('ELECTRICA', 'SANITARIA_AGUA', 'ESTRUCTURAL', 'ESTETICA_CONFORT', 'MOBILIARIO');
CREATE TYPE prioridad_incidencia AS ENUM ('CRITICA', 'ALTA', 'MEDIA', 'BAJA');
CREATE TYPE estado_incidencia   AS ENUM ('PENDIENTE', 'EN_PROCESO', 'RESUELTA');
CREATE TYPE estado_sync         AS ENUM ('PENDIENTE_SINC', 'ENVIADO', 'ERROR_ENVIO');

-- ---------------------------------------------------------------------
-- Validación de RUT chileno (módulo 11), formato normalizado "12345678-K"
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_rut_valido(rut text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  cuerpo text; dv text; suma int := 0; mult int := 2; i int; resto int; esperado text;
BEGIN
  IF rut IS NULL OR rut !~ '^[0-9]{7,8}-[0-9Kk]$' THEN RETURN false; END IF;
  cuerpo := split_part(rut, '-', 1);
  dv     := upper(split_part(rut, '-', 2));
  FOR i IN REVERSE length(cuerpo)..1 LOOP
    suma := suma + substr(cuerpo, i, 1)::int * mult;
    mult := CASE WHEN mult = 7 THEN 2 ELSE mult + 1 END;
  END LOOP;
  resto := 11 - (suma % 11);
  esperado := CASE resto WHEN 11 THEN '0' WHEN 10 THEN 'K' ELSE resto::text END;
  RETURN dv = esperado;
END $$;

-- ---------------------------------------------------------------------
-- usuarios: exclusivamente Jefatura (RF-01..03, RNF-05, RNF-06)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre         varchar(120) NOT NULL,
  email          citext       NOT NULL UNIQUE,
  password_hash  char(60)     NOT NULL,                -- bcrypt: 60 caracteres
  rol            rol_usuario  NOT NULL DEFAULT 'JEFATURA',
  activo         boolean      NOT NULL DEFAULT true,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_usuarios_bcrypt CHECK (password_hash ~ '^\$2[aby]\$[0-9]{2}\$.{53}$'),
  CONSTRAINT ck_usuarios_email  CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- ---------------------------------------------------------------------
-- incidencias (RF-05..11, 15, 16..21, 36..40)
-- ---------------------------------------------------------------------
CREATE TABLE incidencias (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Variables del formulario (todas obligatorias salvo comentario)
  rut_operario          varchar(10)          NOT NULL,
  ubicacion             ubicacion_transito   NOT NULL,
  tipo_falla            tipo_falla           NOT NULL,
  impacto_operativo     boolean              NOT NULL,
  riesgo_accidente      boolean              NOT NULL,
  afecta_terceros       boolean              NOT NULL,
  comentario            varchar(1000),
  -- Resultado del motor de reglas
  prioridad             prioridad_incidencia NOT NULL,
  -- Ciclo de vida
  estado                estado_incidencia    NOT NULL DEFAULT 'PENDIENTE',
  fecha_creacion        timestamptz          NOT NULL DEFAULT now(),
  fecha_inicio_proceso  timestamptz,
  fecha_cierre          timestamptz,
  -- Interoperabilidad con Casa Central
  estado_sync           estado_sync          NOT NULL DEFAULT 'PENDIENTE_SINC',
  id_externo_mallplaza  varchar(64) UNIQUE,
  intentos_sync         smallint             NOT NULL DEFAULT 0,
  proximo_reintento     timestamptz,

  CONSTRAINT ck_inc_rut          CHECK (fn_rut_valido(rut_operario)),
  CONSTRAINT ck_inc_inicio       CHECK (fecha_inicio_proceso IS NULL OR fecha_inicio_proceso >= fecha_creacion),
  CONSTRAINT ck_inc_cierre       CHECK (fecha_cierre IS NULL OR fecha_cierre >= fecha_inicio_proceso),
  -- RF-20 / RF-21: Resuelta <=> tiene cierre, y siempre pasó por En proceso
  CONSTRAINT ck_inc_coherencia   CHECK (
       (estado = 'PENDIENTE'  AND fecha_inicio_proceso IS NULL     AND fecha_cierre IS NULL)
    OR (estado = 'EN_PROCESO' AND fecha_inicio_proceso IS NOT NULL AND fecha_cierre IS NULL)
    OR (estado = 'RESUELTA'   AND fecha_inicio_proceso IS NOT NULL AND fecha_cierre IS NOT NULL)),
  -- RF-37: ENVIADO exige id de OT externa
  CONSTRAINT ck_inc_sync         CHECK (estado_sync <> 'ENVIADO' OR id_externo_mallplaza IS NOT NULL),
  CONSTRAINT ck_inc_intentos     CHECK (intentos_sync >= 0)
);

CREATE INDEX ix_inc_cola      ON incidencias (prioridad, fecha_creacion) WHERE estado <> 'RESUELTA';
CREATE INDEX ix_inc_estado    ON incidencias (estado);
CREATE INDEX ix_inc_ubicacion ON incidencias (ubicacion);
CREATE INDEX ix_inc_tipo      ON incidencias (tipo_falla);
CREATE INDEX ix_inc_creacion  ON incidencias (fecha_creacion);
CREATE INDEX ix_inc_sync_pend ON incidencias (proximo_reintento) WHERE estado_sync <> 'ENVIADO';

-- ---------------------------------------------------------------------
-- evidencias_fotograficas: 0..3 por incidencia (RF-12, 13, 35, RNF-11)
-- Se guarda la clave del objeto (S3), no el binario.
-- ---------------------------------------------------------------------
CREATE TABLE evidencias_fotograficas (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incidencia_id  bigint       NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
  orden          smallint     NOT NULL,
  storage_key    varchar(255) NOT NULL UNIQUE,
  mime_type      varchar(20)  NOT NULL,
  tamano_bytes   integer      NOT NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_evid_orden  CHECK (orden BETWEEN 1 AND 3),               -- máximo 3 por incidencia
  CONSTRAINT uq_evid_orden  UNIQUE (incidencia_id, orden),
  CONSTRAINT ck_evid_mime   CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT ck_evid_tam    CHECK (tamano_bytes > 0 AND tamano_bytes <= 2097152)  -- 2 MB
);

-- ---------------------------------------------------------------------
-- historial_estados: bitácora de cambios de estado (RF-22)
-- ---------------------------------------------------------------------
CREATE TABLE historial_estados (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incidencia_id    bigint            NOT NULL REFERENCES incidencias(id),
  estado_anterior  estado_incidencia,
  estado_nuevo     estado_incidencia NOT NULL,
  usuario_id       bigint REFERENCES usuarios(id),   -- NULL en la creación (reporta un operario)
  fecha            timestamptz       NOT NULL DEFAULT now()
);
CREATE INDEX ix_hist_inc ON historial_estados (incidencia_id, fecha);

-- ---------------------------------------------------------------------
-- log_auditoria_api: un registro por intento de envío (RF-38)
-- ---------------------------------------------------------------------
CREATE TABLE log_auditoria_api (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incidencia_id         bigint      NOT NULL REFERENCES incidencias(id),
  numero_intento        smallint    NOT NULL,
  fecha_intento         timestamptz NOT NULL DEFAULT now(),
  http_status           smallint,                      -- NULL si hubo timeout/red
  resultado             varchar(20) NOT NULL,
  id_externo_mallplaza  varchar(64),
  detalle_error         varchar(500),                  -- nunca incluir API keys ni tokens
  CONSTRAINT ck_log_resultado CHECK (resultado IN ('OK', 'ERROR_HTTP', 'TIMEOUT', 'ERROR_RED')),
  CONSTRAINT ck_log_http      CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
  CONSTRAINT uq_log_intento   UNIQUE (incidencia_id, numero_intento)
);

-- ---------------------------------------------------------------------
-- sla_politica: tiempos objetivo por prioridad (Tabla 4 del informe)
-- ---------------------------------------------------------------------
CREATE TABLE sla_politica (
  prioridad          prioridad_incidencia PRIMARY KEY,
  respuesta_minutos  integer NOT NULL CHECK (respuesta_minutos > 0),
  resolucion_minutos integer NOT NULL CHECK (resolucion_minutos >= respuesta_minutos)
);
INSERT INTO sla_politica VALUES
  ('CRITICA',  15,  240),
  ('ALTA',     30,  480),
  ('MEDIA',   120, 1440),
  ('BAJA',    480, 4320);

-- ---------------------------------------------------------------------
-- Integridad: transiciones de estado válidas (RF-19, 20, 21) y bitácora
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_incidencia_transicion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NOT ((OLD.estado = 'PENDIENTE'  AND NEW.estado = 'EN_PROCESO')
         OR (OLD.estado = 'EN_PROCESO' AND NEW.estado = 'RESUELTA')) THEN
      RAISE EXCEPTION 'Transición inválida: % -> %', OLD.estado, NEW.estado
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.estado = 'EN_PROCESO' THEN NEW.fecha_inicio_proceso := now(); END IF;
    IF NEW.estado = 'RESUELTA'   THEN NEW.fecha_cierre := now(); END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_incidencia_transicion
  BEFORE UPDATE OF estado ON incidencias
  FOR EACH ROW EXECUTE FUNCTION fn_incidencia_transicion();

-- El historial lo escribe la aplicación pasando el usuario con SET LOCAL app.usuario_id
CREATE OR REPLACE FUNCTION fn_incidencia_historial() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE uid bigint := NULLIF(current_setting('app.usuario_id', true), '')::bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO historial_estados (incidencia_id, estado_anterior, estado_nuevo, usuario_id, fecha)
    VALUES (NEW.id, NULL, NEW.estado, NULL, NEW.fecha_creacion);
  ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO historial_estados (incidencia_id, estado_anterior, estado_nuevo, usuario_id)
    VALUES (NEW.id, OLD.estado, NEW.estado, uid);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_incidencia_historial
  AFTER INSERT OR UPDATE OF estado ON incidencias
  FOR EACH ROW EXECUTE FUNCTION fn_incidencia_historial();

-- Bitácoras inalterables (evidencia auditable ISO 14001 / 45001)
CREATE OR REPLACE FUNCTION fn_inmutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de solo inserción', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER trg_hist_inmutable BEFORE UPDATE OR DELETE ON historial_estados
  FOR EACH ROW EXECUTE FUNCTION fn_inmutable();
CREATE TRIGGER trg_log_inmutable  BEFORE UPDATE OR DELETE ON log_auditoria_api
  FOR EACH ROW EXECUTE FUNCTION fn_inmutable();


  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS log_auditoria_api, historial_estados, evidencias_fotograficas, sla_politica, incidencias, usuarios CASCADE;
    DROP FUNCTION IF EXISTS fn_inmutable();
    DROP FUNCTION IF EXISTS fn_incidencia_historial();
    DROP FUNCTION IF EXISTS fn_incidencia_transicion();
    DROP FUNCTION IF EXISTS fn_rut_valido(text);
    DROP TYPE IF EXISTS estado_sync, estado_incidencia, prioridad_incidencia, tipo_falla, ubicacion_transito, rol_usuario;
  `);
};
