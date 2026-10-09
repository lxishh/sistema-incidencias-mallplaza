const request = require("supertest");
const { createApp } = require("../src/app");
const { loadConfig } = require("../src/config");
describe("GET /health", () => {
  it("responde sin consultar la BD", async () => {
    const app = createApp({
      config: loadConfig(),
      pool: {
        query: () => {
          throw new Error("no debe consultar la BD");
        },
      },
    });
    await request(app).get("/health").expect(200, { status: "ok" });
  });
});
