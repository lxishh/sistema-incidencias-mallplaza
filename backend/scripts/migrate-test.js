const path = require("node:path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.test"),
  override: false,
});
const { runner } = require("node-pg-migrate");
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL es requerido");
runner({
  databaseUrl: connectionString,
  dir: path.join(__dirname, "..", "..", "db", "migrations"),
  direction: "up",
  migrationsTable: "pgmigrations",
}).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
