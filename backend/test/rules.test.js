const { calcularPrioridad } = require("../src/rules/prioridad");
describe("calcularPrioridad", () => {
  it("cubre las 24 combinaciones de ubicación y booleanos", () => {
    const cases = [
      ["ALTO_TRANSITO", false, false, false, "MEDIA"],
      ["ALTO_TRANSITO", false, false, true, "ALTA"],
      ["ALTO_TRANSITO", false, true, false, "ALTA"],
      ["ALTO_TRANSITO", false, true, true, "ALTA"],
      ["ALTO_TRANSITO", true, false, false, "CRITICA"],
      ["ALTO_TRANSITO", true, false, true, "CRITICA"],
      ["ALTO_TRANSITO", true, true, false, "CRITICA"],
      ["ALTO_TRANSITO", true, true, true, "CRITICA"],
      ["TRANSITO_MEDIO", false, false, false, "BAJA"],
      ["TRANSITO_MEDIO", false, false, true, "ALTA"],
      ["TRANSITO_MEDIO", false, true, false, "ALTA"],
      ["TRANSITO_MEDIO", false, true, true, "ALTA"],
      ["TRANSITO_MEDIO", true, false, false, "MEDIA"],
      ["TRANSITO_MEDIO", true, false, true, "ALTA"],
      ["TRANSITO_MEDIO", true, true, false, "ALTA"],
      ["TRANSITO_MEDIO", true, true, true, "ALTA"],
      ["BAJO_TRANSITO", false, false, false, "BAJA"],
      ["BAJO_TRANSITO", false, false, true, "ALTA"],
      ["BAJO_TRANSITO", false, true, false, "ALTA"],
      ["BAJO_TRANSITO", false, true, true, "ALTA"],
      ["BAJO_TRANSITO", true, false, false, "MEDIA"],
      ["BAJO_TRANSITO", true, false, true, "ALTA"],
      ["BAJO_TRANSITO", true, true, false, "ALTA"],
      ["BAJO_TRANSITO", true, true, true, "ALTA"],
    ];
    for (const [
      ubicacion,
      impacto_operativo,
      riesgo_accidente,
      afecta_terceros,
      expected,
    ] of cases)
      expect(
        calcularPrioridad({
          ubicacion,
          impacto_operativo,
          riesgo_accidente,
          afecta_terceros,
        }),
      ).toBe(expected);
  });
});
