const pino = require("pino");
const redact = [
  "req.body.rut_operario",
  "req.body.password",
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.rut_operario",
  "*.password",
  "*.password_hash",
];
function safeError(error, env) {
  const safe = {
    name: error?.name,
    message: error?.message,
    code: error?.code,
  };
  if (env !== "production" && error?.stack) safe.stack = error.stack;
  return safe;
}
function createLogger(options = {}) {
  const env = options.env || process.env.NODE_ENV || "development";
  return pino(
    {
      level: options.level || (env === "test" ? "silent" : "info"),
      redact: { paths: redact, censor: "[REDACTED]" },
      serializers: {
        err: (error) => safeError(error, env),
        error: (error) => safeError(error, env),
      },
    },
    options.destination,
  );
}
module.exports = { createLogger, redact };
