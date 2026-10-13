#!/usr/bin/env node
// Genera, a partir de db/seeds/ubicaciones-demo.json, el SQL de datos de demostración
// y la hoja imprimible de QR (el QR contiene SOLO el código de la ubicación).
// Los lugares son FICTICIOS: no corresponden a un plano real de Mallplaza Copiapó.
// Uso: node scripts/generate-ubicaciones-demo.js
const fs = require("node:fs");
const path = require("node:path");
const { generateQrSvg } = require("../src/utils/qr");

const root = path.join(__dirname, "..", "..");
const items = JSON.parse(
  fs.readFileSync(
    path.join(root, "db", "seeds", "ubicaciones-demo.json"),
    "utf8",
  ),
);
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sql = (s) => `'${String(s).replace(/'/g, "''")}'`;

const sqlOut = [
  "-- Datos de DEMOSTRACIÓN (ficticios) para la tabla `ubicaciones`.",
  "-- Requiere la migración propuesta en docs/propuesta-ubicaciones-qr.md (aún no aprobada ni aplicada).",
  "-- Los nombres no corresponden a un plano real de Mallplaza Copiapó.",
  "INSERT INTO ubicaciones (codigo, nombre, sector, nivel_transito) VALUES",
  items
    .map(
      (i) =>
        `  (${sql(i.codigo)}, ${sql(i.nombre)}, ${sql(i.sector)}, ${sql(i.nivel_transito)})`,
    )
    .join(",\n"),
  "ON CONFLICT (codigo) DO NOTHING;",
  "",
].join("\n");
fs.writeFileSync(
  path.join(root, "db", "seeds", "ubicaciones-demo.sql"),
  sqlOut,
);

const nivel = {
  ALTO_TRANSITO: "Alto tránsito",
  TRANSITO_MEDIO: "Tránsito medio",
  BAJO_TRANSITO: "Bajo tránsito",
};
const cards = items
  .map(
    (
      i,
    ) => `<figure><div class="qr">${generateQrSvg(i.codigo, { size: 180 })}</div>
<figcaption><b>${esc(i.nombre)}</b><br>${esc(i.sector)} · ${nivel[i.nivel_transito]}<br><code>${esc(i.codigo)}</code></figcaption></figure>`,
  )
  .join("\n");
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>QR de ubicaciones DEMO</title>
<style>
body{font-family:system-ui,sans-serif;margin:16px;color:#111}
h1{font-size:18px} p{font-size:13px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
figure{margin:0;border:1px solid #bbb;border-radius:8px;padding:10px;text-align:center;break-inside:avoid}
.qr svg{width:180px;height:180px}
figcaption{font-size:12px;margin-top:6px}
code{font-size:13px;letter-spacing:1px}
@media print{body{margin:8mm}}
</style></head><body>
<h1>QR de ubicaciones — DATOS DE DEMOSTRACIÓN</h1>
<p>Ubicaciones ficticias para el prototipo; no corresponden a un plano real. Cada QR contiene solo el código que aparece bajo el nombre (útil para el ingreso manual).</p>
<div class="grid">
${cards}
</div></body></html>`;
fs.writeFileSync(
  path.join(root, "docs", "hoja-qr-ubicaciones-demo.html"),
  html,
);
console.log(
  `${items.length} ubicaciones -> db/seeds/ubicaciones-demo.sql y docs/hoja-qr-ubicaciones-demo.html`,
);
