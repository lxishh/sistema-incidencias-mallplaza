import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const localOnly = process.env.VITE_LOCAL_ONLY === "true";
const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": apiProxyTarget,
      "/health": apiProxyTarget,
    },
  },
  plugins: [
    ...(localOnly ? [] : [VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Gestión de Incidencias — Mallplaza Copiapó",
        short_name: "Incidencias",
        description: "Prototipo local de reporte y gestión de incidencias.",
        theme_color: "#bd1737",
        background_color: "#f7f5f2",
        display: "standalone",
        start_url: "/#/report",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/health$/],
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    })]),
  ],
});
