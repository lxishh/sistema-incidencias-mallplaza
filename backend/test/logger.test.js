const { createLogger } = require("../src/logger");
describe("logger redact", () => {
  it("redacta rut, contraseña, cabeceras y cookies", () => {
    let output = "";
    const destination = {
      write: (chunk) => {
        output += chunk;
      },
    };
    const logger = createLogger({ env: "development", destination });
    logger.info({
      req: {
        body: { rut_operario: "12345678-5", password: "secret" },
        headers: { authorization: "Bearer secret", cookie: "session=secret" },
      },
      res: { headers: { "set-cookie": "session=secret" } },
      data: { password_hash: "hash", rut_operario: "12345678-5" },
    });
    expect(output).not.toContain("12345678-5");
    expect(output).not.toContain("Bearer secret");
    expect(output).not.toContain("session=secret");
    expect(output).not.toContain('"password_hash":"hash"');
    expect(output).toContain('"password_hash":"[REDACTED]"');
  });
});
