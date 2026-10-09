const fs = require("node:fs");
const path = require("node:path");

describe("migración inicial", () => {
  it("reproduce db/schema.sql sin rediseñarlo", () => {
    let migrationSql;
    const migration = require("../../db/migrations/20261009000100000_initial-schema");
    migration.up({
      sql: (sql) => {
        migrationSql = sql;
      },
    });
    const schema = fs.readFileSync(
      path.join(__dirname, "..", "..", "db", "schema.sql"),
      "utf8",
    );
    const expected = schema
      .replace("BEGIN;", "")
      .replace("COMMIT;", "")
      .replace(/\r\n/g, "\n")
      .trim();
    expect(migrationSql.replace(/\r\n/g, "\n").trim()).toBe(expected);
  });
});
