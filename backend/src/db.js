const { Pool } = require("pg");
function createPool(connectionString, nodeEnv = "development") {
  const ssl =
    nodeEnv === "production"
      ? { rejectUnauthorized: true, minVersion: "TLSv1.2" }
      : undefined;
  return new Pool({ connectionString, ...(ssl ? { ssl } : {}) });
}
module.exports = { createPool };
