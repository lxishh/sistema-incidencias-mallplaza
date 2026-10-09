require("dotenv").config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : undefined,
});
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
async function main() {
  const {
    DATABASE_URL,
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
    SEED_ADMIN_NOMBRE = "Jefatura Dev",
  } = process.env;
  if (!DATABASE_URL || !SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD)
    throw new Error(
      "DATABASE_URL, SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD son obligatorios",
    );
  if (SEED_ADMIN_PASSWORD.length < 12)
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres");
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const hash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
    await pool.query(
      "INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING",
      [SEED_ADMIN_NOMBRE, SEED_ADMIN_EMAIL, hash],
    );
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
