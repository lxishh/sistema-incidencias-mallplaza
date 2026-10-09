require("dotenv").config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : undefined,
});
const { loadConfig } = require("./config");
const { createPool } = require("./db");
const { createApp } = require("./app");
const { createLogger } = require("./logger");
function start() {
  const config = loadConfig();
  const pool = createPool(config.DATABASE_URL, config.NODE_ENV);
  const app = createApp({
    config,
    pool,
    logger: createLogger({ env: config.NODE_ENV }),
  });
  const port = Number(process.env.PORT || 3000);
  return app.listen(port, () =>
    process.stdout.write(`Servidor escuchando en puerto ${port}\n`),
  );
}
if (require.main === module) start();
module.exports = { start };
