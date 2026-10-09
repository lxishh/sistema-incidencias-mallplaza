const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const { AppError } = require("../errors");
const { requireJefatura } = require("../middleware/auth");
const { calcularPrioridad } = require("../rules/prioridad");
const locations = ["ALTO_TRANSITO", "TRANSITO_MEDIO", "BAJO_TRANSITO"];
const failures = [
  "ELECTRICA",
  "SANITARIA_AGUA",
  "ESTRUCTURAL",
  "ESTETICA_CONFORT",
  "MOBILIARIO",
];
const inputSchema = z
  .object({
    rut_operario: z
      .string()
      .regex(/^[0-9]{7,8}-[0-9Kk]$/)
      .refine(isValidRut),
    ubicacion: z.enum(locations),
    tipo_falla: z.enum(failures),
    impacto_operativo: z.boolean(),
    riesgo_accidente: z.boolean(),
    afecta_terceros: z.boolean(),
    comentario: z.string().max(1000).optional().nullable(),
  })
  .strict();
function isValidRut(value) {
  if (typeof value !== "string" || !/^[0-9]{7,8}-[0-9Kk]$/.test(value))
    return false;
  const [body, rawDv] = value.split("-");
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected =
    remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return rawDv.toUpperCase() === expected;
}
function detailsFromZod(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    issue: issue.code,
  }));
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}
const MAX_BIGINT = 9223372036854775807n;
function isBigintRange(value) {
  try {
    return BigInt(value) <= MAX_BIGINT;
  } catch {
    return false;
  }
}
const listSchema = z
  .object({
    estado: z.enum(["PENDIENTE", "EN_PROCESO", "RESUELTA"]).optional(),
    prioridad: z.enum(["CRITICA", "ALTA", "MEDIA", "BAJA"]).optional(),
    ubicacion: z.enum(locations).optional(),
    tipo_falla: z.enum(failures).optional(),
    q: z.string().regex(/^\d+$/).refine(isBigintRange).optional(),
    desde: z.string().refine(validDate).optional(),
    hasta: z.string().refine(validDate).optional(),
    page: z
      .string()
      .regex(/^\d+$/)
      .refine((value) => Number.isSafeInteger(Number(value)))
      .optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .refine((value) => Number.isSafeInteger(Number(value)))
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.desde && value.hasta && value.desde > value.hasta)
      ctx.addIssue({
        code: "custom",
        path: ["desde"],
        message: "desde debe ser menor o igual a hasta",
      });
    if (value.page && Number(value.page) < 1)
      ctx.addIssue({
        code: "custom",
        path: ["page"],
        message: "page debe ser mayor o igual a 1",
      });
    if (value.limit && (Number(value.limit) < 1 || Number(value.limit) > 100))
      ctx.addIssue({
        code: "custom",
        path: ["limit"],
        message: "limit debe estar entre 1 y 100",
      });
    if (
      value.page &&
      value.limit &&
      !Number.isSafeInteger(Number(value.page) * Number(value.limit || 20))
    )
      ctx.addIssue({
        code: "custom",
        path: ["page"],
        message: "offset fuera de rango",
      });
  });
function catalogosRouter() {
  const router = express.Router();
  router.get("/", (_req, res) =>
    res.json({ ubicaciones: locations, tipos_falla: failures }),
  );
  return router;
}
function incidenciasRouter({ config, pool }) {
  const router = express.Router();
  const auth = requireJefatura(config);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.RATE_LIMIT_INCIDENCIAS_MAX,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(
        new AppError(
          429,
          "RATE_LIMITED",
          "Demasiadas solicitudes. Intenta más tarde.",
        ),
      ),
  });
  router.post("/", limiter, async (req, res, next) => {
    try {
      const parsed = inputSchema.safeParse(req.body);
      if (!parsed.success)
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Datos de incidencia inválidos",
          detailsFromZod(parsed.error),
        );
      const data = parsed.data;
      const prioridad = calcularPrioridad(data);
      const { rows } = await pool.query(
        "INSERT INTO incidencias (rut_operario, ubicacion, tipo_falla, impacto_operativo, riesgo_accidente, afecta_terceros, comentario, prioridad, estado_sync) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDIENTE_SINC') RETURNING id, prioridad, estado, estado_sync, fecha_creacion",
        [
          data.rut_operario.toUpperCase(),
          data.ubicacion,
          data.tipo_falla,
          data.impacto_operativo,
          data.riesgo_accidente,
          data.afecta_terceros,
          data.comentario ?? null,
          prioridad,
        ],
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  });
  router.get("/", auth, async (req, res, next) => {
    try {
      const parsed = listSchema.safeParse(req.query);
      if (!parsed.success)
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Filtros inválidos",
          detailsFromZod(parsed.error),
        );
      const filters = parsed.data;
      const page = Number(filters.page || 1);
      const limit = Number(filters.limit || 20);
      const values = [];
      const where = [];
      const add = (sql, value) => {
        values.push(value);
        where.push(sql.replace("?", `$${values.length}`));
      };
      for (const key of ["estado", "prioridad", "ubicacion", "tipo_falla"])
        if (filters[key]) add(`${key} = ?`, filters[key]);
      if (filters.q) add("id = ?", filters.q);
      if (filters.desde) {
        values.push(filters.desde, config.REPORT_TZ);
        where.push(
          `fecha_creacion >= ($${values.length - 1}::date::timestamp AT TIME ZONE $${values.length})`,
        );
      }
      if (filters.hasta) {
        values.push(filters.hasta, config.REPORT_TZ);
        where.push(
          `fecha_creacion < (($${values.length - 1}::date + 1)::timestamp AT TIME ZONE $${values.length})`,
        );
      }
      const condition = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const count = await pool.query(
        `SELECT count(*)::int AS total FROM incidencias ${condition}`,
        values,
      );
      const offset = (page - 1) * limit;
      const dataValues = [...values, limit, offset];
      const data = await pool.query(
        `SELECT id, ubicacion, tipo_falla, impacto_operativo, riesgo_accidente, afecta_terceros, comentario, prioridad, estado, fecha_creacion, fecha_inicio_proceso, fecha_cierre, estado_sync, id_externo_mallplaza FROM incidencias ${condition} ORDER BY prioridad ASC, fecha_creacion ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        dataValues,
      );
      res.json({ data: data.rows, page, limit, total: count.rows[0].total });
    } catch (error) {
      next(error);
    }
  });
  router.get("/:id", auth, async (req, res, next) => {
    try {
      if (!/^\d+$/.test(req.params.id))
        throw new AppError(400, "VALIDATION_ERROR", "Identificador inválido", [
          { field: "id", issue: "invalid_string" },
        ]);
      const result = await pool.query(
        "SELECT * FROM incidencias WHERE id = $1",
        [req.params.id],
      );
      if (!result.rows[0])
        throw new AppError(404, "NOT_FOUND", "Incidencia no encontrada");
      const row = result.rows[0];
      const history = await pool.query(
        "SELECT h.estado_anterior, h.estado_nuevo, h.fecha, u.nombre AS usuario_nombre FROM historial_estados h LEFT JOIN usuarios u ON u.id = h.usuario_id WHERE h.incidencia_id = $1 ORDER BY h.fecha ASC, h.id ASC",
        [req.params.id],
      );
      const { intentos_sync, ...detail } = row;
      delete detail.proximo_reintento;
      res.json({
        ...detail,
        sync: {
          estado: row.estado_sync,
          id_externo_mallplaza: row.id_externo_mallplaza,
          intentos: intentos_sync,
        },
        historial: history.rows.map((h) => ({
          ...h,
          usuario: h.usuario_nombre,
          usuario_nombre: undefined,
        })),
        evidencias: [],
      });
    } catch (error) {
      next(error);
    }
  });
  router.patch("/:id/estado", auth, async (req, res, next) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || BigInt(req.params.id) > MAX_BIGINT)
      return next(
        new AppError(400, "VALIDATION_ERROR", "Identificador inválido", [
          { field: "id", issue: "invalid_string" },
        ]),
      );
    const body = z
      .object({ estado: z.enum(["PENDIENTE", "EN_PROCESO", "RESUELTA"]) })
      .strict()
      .safeParse(req.body);
    if (!body.success)
      return next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "Estado inválido",
          detailsFromZod(body.error),
        ),
      );
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const selected = await client.query(
        "SELECT id, estado FROM incidencias WHERE id = $1 FOR UPDATE",
        [req.params.id],
      );
      if (!selected.rows[0])
        throw new AppError(404, "NOT_FOUND", "Incidencia no encontrada");
      const current = selected.rows[0].estado;
      const target = body.data.estado;
      if (!(
        (current === "PENDIENTE" && target === "EN_PROCESO") ||
        (current === "EN_PROCESO" && target === "RESUELTA")
      ))
        throw new AppError(
          409,
          "INVALID_TRANSITION",
          "Transición de estado inválida",
        );
      await client.query("SELECT set_config('app.usuario_id', $1, true)", [
        String(req.user.id),
      ]);
      const updated = await client.query(
        "UPDATE incidencias SET estado = $1 WHERE id = $2 RETURNING id, estado, fecha_inicio_proceso, fecha_cierre",
        [target, req.params.id],
      );
      await client.query("COMMIT");
      res.json(updated.rows[0]);
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      if (
        error.code === "23514" &&
        String(error.message).startsWith("Transición inválida")
      )
        return next(
          new AppError(
            409,
            "INVALID_TRANSITION",
            "Transición de estado inválida",
          ),
        );
      if (error.code === "23514")
        return next(
          new AppError(500, "INTEGRITY_ERROR", "Error de integridad"),
        );
      next(error);
    } finally {
      client?.release();
    }
  });
  return router;
}
module.exports = { incidenciasRouter, catalogosRouter, isValidRut, listSchema };
