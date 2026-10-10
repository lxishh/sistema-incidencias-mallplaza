const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { loadConfig } = require("../src/config");
const { pool, resetDatabase } = require("./db");
const config = loadConfig();
const app = createApp({ config, pool });
const rutValido = "12345678-5";
async function createUser({ activo = true } = {}) {
  const hash = await bcrypt.hash("Password123!", 12);
  const result = await pool.query(
    "INSERT INTO usuarios (nombre,email,password_hash,activo) VALUES ('Jefatura','jefatura@test.cl',$1,$2) RETURNING id",
    [hash, activo],
  );
  return result.rows[0].id;
}
async function createIncident(overrides = {}) {
  const result = await pool.query(
    "INSERT INTO incidencias (rut_operario,ubicacion,tipo_falla,impacto_operativo,riesgo_accidente,afecta_terceros,prioridad,fecha_creacion) VALUES ($1,'BAJO_TRANSITO','ELECTRICA',false,false,false,'BAJA',$2) RETURNING id",
    [rutValido, overrides.fecha || new Date().toISOString()],
  );
  return result.rows[0].id;
}
async function login() {
  await createUser();
  return request(app)
    .post("/api/auth/login")
    .send({ email: "jefatura@test.cl", password: "Password123!" });
}
beforeEach(resetDatabase);
afterAll(async () => pool.end());
describe("autenticación", () => {
  it("inicia y cierra sesión", async () => {
    const response = await login();
    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"][0]).toContain("SameSite=Strict");
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", response.headers["set-cookie"][0].split(";")[0]);
    expect(logout.status).toBe(204);
    expect(logout.headers["set-cookie"][0]).toMatch(/^mallplaza_session=;/);
    await request(app)
      .get("/api/auth/me")
      .set("Cookie", logout.headers["set-cookie"][0].split(";")[0])
      .expect(401);
  });
  it("usa error genérico para credenciales incorrectas y usuario inactivo", async () => {
    await createUser();
    const invalid = await request(app)
      .post("/api/auth/login")
      .send({ email: "jefatura@test.cl", password: "wrong-password" });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.message).toBe("Credenciales inválidas");
    await resetDatabase();
    await createUser({ activo: false });
    const inactive = await request(app)
      .post("/api/auth/login")
      .send({ email: "jefatura@test.cl", password: "Password123!" });
    expect(inactive.status).toBe(401);
    expect(inactive.body.error.message).toBe("Credenciales inválidas");
  });
  it("protege /me y limita intentos", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    const limited = createApp({
      config: { ...config, RATE_LIMIT_LOGIN_MAX: 3 },
      pool,
    });
    for (let i = 0; i < 3; i += 1)
      await request(limited)
        .post("/api/auth/login")
        .send({ email: "x@test.cl", password: "x" });
    const response = await request(limited)
      .post("/api/auth/login")
      .send({ email: "x@test.cl", password: "x" });
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("RATE_LIMITED");
  });
});
describe("incidencias", () => {
  it("valida RUT, no lo expone en lista y sí en detalle; avanza con historial", async () => {
    const userId = await createUser();
    const token = jwt.sign({ rol: "JEFATURA" }, config.JWT_SECRET, {
      subject: String(userId),
      algorithm: "HS256",
    });
    const cookie = `mallplaza_session=${token}`;
    const invalid = await request(app).post("/api/incidencias").send({
      rut_operario: "12345678-0",
      ubicacion: "BAJO_TRANSITO",
      tipo_falla: "ELECTRICA",
      impacto_operativo: false,
      riesgo_accidente: false,
      afecta_terceros: false,
    });
    expect(invalid.status).toBe(400);
    const created = await request(app).post("/api/incidencias").send({
      rut_operario: rutValido,
      ubicacion: "BAJO_TRANSITO",
      tipo_falla: "ELECTRICA",
      impacto_operativo: false,
      riesgo_accidente: false,
      afecta_terceros: false,
    });
    expect(created.status).toBe(201);
    expect(created.body.estado_sync).toBe("PENDIENTE_SINC");
    const initialKpis = await request(app)
      .get("/api/dashboard/kpis")
      .set("Cookie", cookie)
      .expect(200);
    expect(initialKpis.body).toMatchObject({
      total: 1,
      resueltas: 0,
      mttr_minutos: null,
      cumplimiento_sla_porcentaje: null,
    });
    expect(
      (
        await request(app)
          .patch(`/api/incidencias/${created.body.id}/estado`)
          .set("Cookie", cookie)
          .send({ estado: "RESUELTA" })
      ).status,
    ).toBe(409);
    await request(app)
      .patch(`/api/incidencias/${created.body.id}/estado`)
      .set("Cookie", cookie)
      .send({ estado: "EN_PROCESO" })
      .expect(200);
    await request(app)
      .patch(`/api/incidencias/${created.body.id}/estado`)
      .set("Cookie", cookie)
      .send({ estado: "RESUELTA" })
      .expect(200);
    const list = await request(app)
      .get("/api/incidencias")
      .set("Cookie", cookie)
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain(rutValido);
    const detail = await request(app)
      .get(`/api/incidencias/${created.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.rut_operario).toBe(rutValido);
    expect(detail.body.historial).toHaveLength(3);
    const resolvedKpis = await request(app)
      .get("/api/dashboard/kpis")
      .set("Cookie", cookie)
      .expect(200);
    expect(resolvedKpis.body).toMatchObject({
      total: 1,
      resueltas: 1,
      abiertas: 0,
      mttr_minutos: expect.any(Number),
      cumplimiento_sla_porcentaje: 100,
      resueltas_en_sla: 1,
    });
  });
  it("rechaza filtros inválidos y limita envíos públicos", async () => {
    const userId = await createUser();
    const token = jwt.sign({ rol: "JEFATURA" }, config.JWT_SECRET, {
      subject: String(userId),
      algorithm: "HS256",
    });
    const cookie = `mallplaza_session=${token}`;
    await request(app)
      .get("/api/incidencias?page=nope")
      .set("Cookie", cookie)
      .expect(400);
    const limited = createApp({
      config: { ...config, RATE_LIMIT_INCIDENCIAS_MAX: 2 },
      pool,
    });
    const payload = {
      rut_operario: rutValido,
      ubicacion: "BAJO_TRANSITO",
      tipo_falla: "ELECTRICA",
      impacto_operativo: false,
      riesgo_accidente: false,
      afecta_terceros: false,
    };
    await request(limited).post("/api/incidencias").send(payload).expect(201);
    await request(limited).post("/api/incidencias").send(payload).expect(201);
    const response = await request(limited)
      .post("/api/incidencias")
      .send(payload);
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("RATE_LIMITED");
  });
  it("incluye el borde final de fecha en America/Santiago", async () => {
    const userId = await createUser();
    const token = jwt.sign({ rol: "JEFATURA" }, config.JWT_SECRET, {
      subject: String(userId),
      algorithm: "HS256",
    });
    const cookie = `mallplaza_session=${token}`;
    await createIncident({ fecha: "2026-01-10T23:30:00-03:00" });
    await createIncident({ fecha: "2026-01-11T00:30:00-03:00" });
    const response = await request(app)
      .get("/api/incidencias?desde=2026-01-10&hasta=2026-01-10")
      .set("Cookie", cookie)
      .expect(200);
    expect(response.body.data).toHaveLength(1);
  });
});
describe("dashboard KPI", () => {
  it("protege el endpoint y calcula MTTR, SLA, vencidas y distribuciones", async () => {
    const denied = await request(app).get("/api/dashboard/kpis");
    expect(denied.status).toBe(401);

    const auth = await login();
    const cookie = auth.headers["set-cookie"][0].split(";")[0];
    const now = Date.now();
    const atMinutesAgo = (minutes) => new Date(now - minutes * 60_000);
    const fixtures = [
      {
        prioridad: "CRITICA",
        estado: "RESUELTA",
        fecha_creacion: atMinutesAgo(30),
        fecha_inicio_proceso: atMinutesAgo(25),
        fecha_cierre: atMinutesAgo(10),
      },
      {
        prioridad: "ALTA",
        estado: "RESUELTA",
        fecha_creacion: atMinutesAgo(540),
        fecha_inicio_proceso: atMinutesAgo(510),
        fecha_cierre: new Date(now),
      },
      {
        prioridad: "MEDIA",
        estado: "PENDIENTE",
        fecha_creacion: atMinutesAgo(1500),
        fecha_inicio_proceso: null,
        fecha_cierre: null,
      },
      {
        prioridad: "BAJA",
        estado: "PENDIENTE",
        fecha_creacion: atMinutesAgo(30),
        fecha_inicio_proceso: null,
        fecha_cierre: null,
      },
    ];

    for (const fixture of fixtures) {
      await pool.query(
        "INSERT INTO incidencias (rut_operario, ubicacion, tipo_falla, impacto_operativo, riesgo_accidente, afecta_terceros, prioridad, estado, fecha_creacion, fecha_inicio_proceso, fecha_cierre) VALUES ($1, 'BAJO_TRANSITO', 'ELECTRICA', false, false, false, $2, $3, $4, $5, $6)",
        [
          rutValido,
          fixture.prioridad,
          fixture.estado,
          fixture.fecha_creacion,
          fixture.fecha_inicio_proceso,
          fixture.fecha_cierre,
        ],
      );
    }

    const response = await request(app)
      .get("/api/dashboard/kpis")
      .set("Cookie", cookie)
      .expect(200);
    expect(response.body).toMatchObject({
      total: 4,
      resueltas: 2,
      abiertas: 2,
      abiertas_vencidas: 1,
      mttr_minutos: 280,
      cumplimiento_sla_porcentaje: 50,
      resueltas_en_sla: 1,
      por_prioridad: { CRITICA: 1, ALTA: 1, MEDIA: 1, BAJA: 1 },
      por_tipo_falla: { ELECTRICA: 4 },
      por_ubicacion: { BAJO_TRANSITO: 4 },
      por_estado_sync: { PENDIENTE_SINC: 4 },
    });
    expect(response.body.periodo.desde).toBeNull();
    expect(response.body.periodo.hasta).toBeNull();
  });

  it("devuelve nulos para denominadores vacíos y rechaza rangos inválidos", async () => {
    const auth = await login();
    const cookie = auth.headers["set-cookie"][0].split(";")[0];
    const empty = await request(app)
      .get("/api/dashboard/kpis")
      .set("Cookie", cookie)
      .expect(200);
    expect(empty.body.mttr_minutos).toBeNull();
    expect(empty.body.cumplimiento_sla_porcentaje).toBeNull();
    expect(empty.body.por_prioridad).toEqual({});

    await request(app)
      .get("/api/dashboard/kpis?desde=2026-02-30")
      .set("Cookie", cookie)
      .expect(400);
    await request(app)
      .get("/api/dashboard/kpis?desde=2026-10-10&hasta=2026-10-09")
      .set("Cookie", cookie)
      .expect(400);
  });
});
describe("auditoría de Casa Central", () => {
  it("registra los cuatro resultados con detalle fijo", async () => {
    const hash = await bcrypt.hash("Password123!", 12);
    await pool.query(
      "INSERT INTO usuarios (nombre,email,password_hash) VALUES ('Test','audit@test.cl',$1)",
      [hash],
    );
    const inc = await pool.query(
      "INSERT INTO incidencias (rut_operario,ubicacion,tipo_falla,impacto_operativo,riesgo_accidente,afecta_terceros,prioridad) VALUES ('12345678-5','BAJO_TRANSITO','ELECTRICA',false,false,false,'BAJA') RETURNING id",
    );
    const { registrarIntento } = require("../src/integrations/auditoriaApi");
    const inputs = [
      { tipo: "OK", idExterno: "MOCK-1" },
      { tipo: "HTTP_ERROR", status: 500 },
      { tipo: "TIMEOUT" },
      { tipo: "NETWORK_ERROR" },
    ];
    const rows = [];
    for (let i = 0; i < inputs.length; i += 1)
      rows.push(
        await registrarIntento({
          pool,
          incidenciaId: inc.rows[0].id,
          numeroIntento: i + 1,
          resultado: inputs[i],
        }),
      );
    expect(rows.map((row) => row.resultado)).toEqual([
      "OK",
      "ERROR_HTTP",
      "TIMEOUT",
      "ERROR_RED",
    ]);
    expect(rows.map((row) => row.detalle_error)).toEqual([
      null,
      "Respuesta HTTP 500",
      "Timeout de 5000 ms",
      "Error de red",
    ]);
  });
});
describe("protección de datos en logs", () => {
  it("no registra el RUT ante una validación o error PostgreSQL", async () => {
    let output = "";
    const { createLogger } = require("../src/logger");
    const logger = createLogger({
      env: "test",
      level: "info",
      destination: {
        write: (chunk) => {
          output += chunk;
        },
      },
    });
    const appWithLogger = createApp({ config, pool, logger });
    await request(appWithLogger).post("/api/incidencias").send({
      rut_operario: "87654321-1",
      ubicacion: "BAJO_TRANSITO",
      tipo_falla: "ELECTRICA",
      impacto_operativo: false,
      riesgo_accidente: false,
      afecta_terceros: false,
    });
    try {
      await pool.query(
        "INSERT INTO incidencias (rut_operario,ubicacion,tipo_falla,impacto_operativo,riesgo_accidente,afecta_terceros,prioridad) VALUES ('87654321-1','BAJO_TRANSITO','ELECTRICA',false,false,false,'BAJA')",
      );
    } catch (error) {
      logger.error({ err: error }, "error de base de datos");
    }
    expect(output).not.toContain("87654321-1");
  });
});
