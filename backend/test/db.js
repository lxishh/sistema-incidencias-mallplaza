const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
async function resetDatabase() {
  await pool.query(
    "TRUNCATE TABLE log_auditoria_api, historial_estados, evidencias_fotograficas, incidencias, usuarios, sla_politica RESTART IDENTITY CASCADE",
  );
  await pool.query(
    "INSERT INTO sla_politica (prioridad, respuesta_minutos, resolucion_minutos) VALUES ('CRITICA',15,240),('ALTA',30,480),('MEDIA',120,1440),('BAJA',480,4320)",
  );
}
module.exports = { pool, resetDatabase };
