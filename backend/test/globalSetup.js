const { runner } = require("node-pg-migrate");
const path = require("node:path");
module.exports = async function globalSetup() {
  require("dotenv").config({
    path: path.join(__dirname, "..", ".env.test"),
    override: false,
  });
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "TEST_DATABASE_URL es requerido para las pruebas de integración",
    );
  await runner({
    databaseUrl: connectionString,
    dir: path.join(__dirname, "..", "..", "db", "migrations"),
    direction: "up",
    migrationsTable: "pgmigrations",
    log: () => {},
  });
};
