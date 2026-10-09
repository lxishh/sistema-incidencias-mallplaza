const {
  createCasaCentralClient,
} = require("../src/integrations/casaCentralClient");

describe("CasaCentralClient mock", () => {
  it("simula éxito", async () => {
    await expect(
      createCasaCentralClient().crearOrdenTrabajo({ secret: "ignored" }),
    ).resolves.toEqual({ id_externo: "MOCK-1" });
  });
  it.each([
    ["http_error", "HTTP_ERROR"],
    ["network_error", "NETWORK_ERROR"],
    ["timeout", "TIMEOUT"],
  ])("simula %s", async (mode, type) => {
    const client = createCasaCentralClient({ mode, timeoutMs: 1 });
    await expect(client.crearOrdenTrabajo({})).rejects.toMatchObject({ type });
  });
});
