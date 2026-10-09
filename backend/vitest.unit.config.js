const { defineConfig } = require("vitest/config");
const path = require("node:path");
module.exports = defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "test/rules.test.js",
      "test/config.test.js",
      "test/health.test.js",
      "test/integrations.test.js",
      "test/migration.test.js",
      "test/filters.test.js",
    ],
    setupFiles: [path.join(__dirname, "test", "setup.js")],
    testTimeout: 15000,
  },
});
