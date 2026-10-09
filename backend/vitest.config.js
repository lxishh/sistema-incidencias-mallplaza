const { defineConfig } = require("vitest/config");
const path = require("node:path");
module.exports = defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: [path.join(__dirname, "test", "setup.js")],
    globalSetup: [path.join(__dirname, "test", "globalSetup.js")],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
