const { z } = require("zod");
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]),
  REPORT_TZ: z
    .string()
    .default("America/Santiago")
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Debe ser una zona horaria IANA válida"),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_INCIDENCIAS_MAX: z.coerce.number().int().positive().default(60),
  SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(30),
});
function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Configuración inválida: ${missing}`);
  }
  return Object.freeze(parsed.data);
}
module.exports = { loadConfig };
