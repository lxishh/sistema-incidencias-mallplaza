const { listSchema, isValidRut } = require("../src/routes/incidencias");

describe("validación de filtros y RUT", () => {
  it.each([
    [{ q: "not-a-number" }],
    [{ q: "999999999999999999999999999999999999" }],
    [{ page: "9007199254740992" }],
    [{ limit: "101" }],
    [{ desde: "2026-02-30" }],
    [{ desde: "2026-02-02", hasta: "2026-02-01" }],
  ])("rechaza filtros fuera del contrato: %o", (query) => {
    expect(listSchema.safeParse(query).success).toBe(false);
  });

  it("valida RUT con módulo 11", () => {
    expect(isValidRut("12345678-5")).toBe(true);
    expect(isValidRut("12345678-0")).toBe(false);
  });
});
