const { loadConfig } = require("../src/config");
describe("loadConfig", () => {
  it("valida configuración sin ejecutar al importar", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://test",
      JWT_SECRET: "x".repeat(32),
      NODE_ENV: "test",
    });
    expect(config.REPORT_TZ).toBe("America/Santiago");
    expect(config.RATE_LIMIT_INCIDENCIAS_MAX).toBe(60);
    expect(config.SESSION_TTL_MINUTES).toBe(30);
  });
  it("permite personalizar SESSION_TTL_MINUTES", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://test",
      JWT_SECRET: "x".repeat(32),
      NODE_ENV: "test",
      SESSION_TTL_MINUTES: "45",
    });
    expect(config.SESSION_TTL_MINUTES).toBe(45);
  });
  it("muestra campos faltantes sin valores sensibles", () => {
    expect(() => loadConfig({})).toThrow("DATABASE_URL, JWT_SECRET, NODE_ENV");
  });
});
