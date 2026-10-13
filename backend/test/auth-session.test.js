const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createApp } = require("../src/app");
const { loadConfig } = require("../src/config");

describe("Vigencia de sesión (SESSION_TTL_MINUTES)", () => {
  const passwordHash = bcrypt.hashSync("secreto123", 4);
  const mockUser = {
    id: 1,
    nombre: "Jefatura Demo",
    email: "jefatura@example.test",
    password_hash: passwordHash,
    rol: "JEFATURA",
    activo: true,
  };

  function createTestApp(envOverrides = {}) {
    const config = loadConfig({
      DATABASE_URL: "postgres://mock:5432/test",
      JWT_SECRET: "x".repeat(32),
      NODE_ENV: "test",
      ...envOverrides,
    });
    const pool = {
      query: async (text) => {
        if (text.includes("FROM usuarios WHERE email")) {
          return { rows: [mockUser] };
        }
        return { rows: [] };
      },
    };
    return { app: createApp({ config, pool }), config };
  }

  it("usa SESSION_TTL_MINUTES personalizado para token exp y cookie Max-Age", async () => {
    const { app, config } = createTestApp({ SESSION_TTL_MINUTES: "15" });
    expect(config.SESSION_TTL_MINUTES).toBe(15);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "jefatura@example.test", password: "secreto123" });

    expect(res.status).toBe(200);

    const cookieHeader = res.headers["set-cookie"][0];
    expect(cookieHeader).toBeDefined();

    const maxAgeMatch = cookieHeader.match(/Max-Age=(\d+)/i);
    expect(maxAgeMatch).not.toBeNull();
    const cookieMaxAgeSec = Number(maxAgeMatch[1]);
    expect(cookieMaxAgeSec).toBe(15 * 60);

    const tokenMatch = cookieHeader.match(/mallplaza_session=([^;]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const tokenTtlSec = decoded.exp - decoded.iat;
    expect(tokenTtlSec).toBe(15 * 60);

    expect(cookieMaxAgeSec).toBe(tokenTtlSec);
  });

  it("usa 30 minutos por defecto cuando no se define la variable", async () => {
    const { app, config } = createTestApp();
    expect(config.SESSION_TTL_MINUTES).toBe(30);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "jefatura@example.test", password: "secreto123" });

    expect(res.status).toBe(200);

    const cookieHeader = res.headers["set-cookie"][0];
    const maxAgeMatch = cookieHeader.match(/Max-Age=(\d+)/i);
    expect(Number(maxAgeMatch[1])).toBe(30 * 60);

    const tokenMatch = cookieHeader.match(/mallplaza_session=([^;]+)/);
    const decoded = jwt.verify(tokenMatch[1], config.JWT_SECRET);
    expect(decoded.exp - decoded.iat).toBe(30 * 60);
  });
});
