const express = require("express");
const { z } = require("zod");
const { AppError } = require("../errors");
const { requireJefatura } = require("../middleware/auth");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  });

const querySchema = z
  .object({ desde: dateSchema.optional(), hasta: dateSchema.optional() })
  .strict()
  .superRefine((value, ctx) => {
    if (value.desde && value.hasta && value.desde > value.hasta) {
      ctx.addIssue({
        code: "custom",
        path: ["desde"],
        message: "desde debe ser menor o igual a hasta",
      });
    }
  });

function dashboardRouter({ config, pool }) {
  const router = express.Router();
  const auth = requireJefatura(config);

  router.get("/kpis", auth, async (req, res, next) => {
    try {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Rango de fechas inválido",
          parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            issue: issue.code,
          })),
        );
      }

      const { desde, hasta } = parsed.data;
      const values = [config.REPORT_TZ];
      const where = [];
      if (desde) {
        values.push(desde);
        where.push(
          `i.fecha_creacion >= ($${values.length}::date::timestamp AT TIME ZONE $1)`,
        );
      }
      if (hasta) {
        values.push(hasta);
        where.push(
          `i.fecha_creacion < (($${values.length}::date + 1)::timestamp AT TIME ZONE $1)`,
        );
      }
      const condition = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const base = `FROM incidencias i JOIN sla_politica s ON s.prioridad = i.prioridad ${condition}`;
      const metricas = await pool.query(
        `SELECT count(*)::int AS total,
          count(*) FILTER (WHERE i.estado = 'RESUELTA')::int AS resueltas,
          count(*) FILTER (WHERE i.estado <> 'RESUELTA')::int AS abiertas,
          count(*) FILTER (WHERE i.estado <> 'RESUELTA' AND now() > i.fecha_creacion + s.resolucion_minutos * interval '1 minute')::int AS abiertas_vencidas,
          count(*) FILTER (WHERE i.estado = 'RESUELTA' AND i.fecha_cierre <= i.fecha_creacion + s.resolucion_minutos * interval '1 minute')::int AS resueltas_en_sla,
          round((avg(extract(epoch FROM (i.fecha_cierre - i.fecha_creacion)) / 60) FILTER (WHERE i.estado = 'RESUELTA'))::numeric, 1) AS mttr_minutos
          ${base}`,
        values,
      );
      const agrupaciones = await pool.query(
        `SELECT
          coalesce(jsonb_object_agg(prioridad, prioridad_count) FILTER (WHERE prioridad IS NOT NULL), '{}'::jsonb) AS por_prioridad,
          coalesce(jsonb_object_agg(tipo_falla, tipo_count) FILTER (WHERE tipo_falla IS NOT NULL), '{}'::jsonb) AS por_tipo_falla,
          coalesce(jsonb_object_agg(ubicacion, ubicacion_count) FILTER (WHERE ubicacion IS NOT NULL), '{}'::jsonb) AS por_ubicacion,
          coalesce(jsonb_object_agg(estado_sync, sync_count) FILTER (WHERE estado_sync IS NOT NULL), '{}'::jsonb) AS por_estado_sync
        FROM (
          SELECT i.prioridad, count(*) OVER (PARTITION BY i.prioridad)::int AS prioridad_count,
            i.tipo_falla, count(*) OVER (PARTITION BY i.tipo_falla)::int AS tipo_count,
            i.ubicacion, count(*) OVER (PARTITION BY i.ubicacion)::int AS ubicacion_count,
            i.estado_sync, count(*) OVER (PARTITION BY i.estado_sync)::int AS sync_count
          ${base}
        ) dimensiones`,
        values,
      );
      const summary = metricas.rows[0];
      const closed = summary.resueltas;
      res.json({
        periodo: {
          desde: desde || null,
          hasta: hasta || null,
          zona_horaria: config.REPORT_TZ,
        },
        total: summary.total,
        resueltas: closed,
        abiertas: summary.abiertas,
        abiertas_vencidas: summary.abiertas_vencidas,
        mttr_minutos:
          summary.mttr_minutos === null ? null : Number(summary.mttr_minutos),
        cumplimiento_sla_porcentaje:
          closed === 0
            ? null
            : Number(((summary.resueltas_en_sla / closed) * 100).toFixed(1)),
        resueltas_en_sla: summary.resueltas_en_sla,
        por_prioridad: agrupaciones.rows[0].por_prioridad,
        por_tipo_falla: agrupaciones.rows[0].por_tipo_falla,
        por_ubicacion: agrupaciones.rows[0].por_ubicacion,
        por_estado_sync: agrupaciones.rows[0].por_estado_sync,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { dashboardRouter, querySchema };
