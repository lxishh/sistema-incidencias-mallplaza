const express = require("express");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");
const { createLogger } = require("./logger");
const { AppError, errorPayload } = require("./errors");
const { authRouter } = require("./routes/auth");
const { incidenciasRouter, catalogosRouter } = require("./routes/incidencias");
const { dashboardRouter } = require("./routes/dashboard");
function createApp({
  config,
  pool,
  logger = createLogger({ env: config?.NODE_ENV }),
} = {}) {
  if (!config) throw new TypeError("config es obligatorio");
  if (!pool) throw new TypeError("pool es obligatorio");
  const app = express();
  app.disable("x-powered-by");
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req) => ({ method: req.method, url: req.url, id: req.id }),
      },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.use("/api/auth", authRouter({ config, pool }));
  app.use("/api/catalogos", catalogosRouter());
  app.use("/api/dashboard", dashboardRouter({ config, pool }));
  app.use("/api/incidencias", incidenciasRouter({ config, pool }));
  app.use((_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "Recurso no encontrado")),
  );
  app.use((error, req, res, _next) => {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) req.log.error({ err: error }, "Solicitud fallida");
    else req.log.warn({ err: error }, "Solicitud rechazada");
    res.status(status).json(errorPayload(error));
  });
  return app;
}
module.exports = { createApp };
