#!/usr/bin/env node
// Genera el código QR de demostración local para reportar incidencias
// Uso: node scripts/generate-demo-qr.js [--url=http://192.168.1.50:5173/#/report] [--host=192.168.1.50]

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { generateQr } = require("../src/utils/qr");

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value || true;
    }
  }
  return args;
}

function detectLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        iface.address !== "127.0.0.1" &&
        !iface.address.startsWith("10.255.")
      ) {
        return iface.address;
      }
    }
  }
  return null;
}

function main() {
  const args = parseArgs();
  const port = args.port || "5173";
  const pathPart = args.path || "/#/report";

  let targetUrl = args.url;
  if (!targetUrl) {
    const host = args.host || detectLocalIp() || "localhost";
    targetUrl = `http://${host}:${port}${pathPart}`;
  }

  process.stdout.write(
    "============================================================\n",
  );
  process.stdout.write(
    "  SISTEMA DE INCIDENCIAS — MALLPLAZA COPIAPÓ (DEMO LOCAL)\n",
  );
  process.stdout.write(
    "============================================================\n\n",
  );
  process.stdout.write(`Destino codificado: ${targetUrl}\n\n`);

  const qr = generateQr(targetUrl);
  process.stdout.write(
    "Código QR para escaneo con cámara móvil (misma red local):\n\n",
  );
  process.stdout.write(qr.toAscii({ margin: 2 }));
  process.stdout.write(
    "\n💡 Nota: Para escanear con la cámara del teléfono, se recomienda abrir la ficha gráfica en el navegador:\n" +
      "   xdg-open docs/demo-qr.html (o en Windows abrir docs/demo-qr.html)\n\n",
  );

  const repoRoot = path.resolve(__dirname, "..", "..");
  const publicDir = path.join(repoRoot, "frontend", "public");
  const docsDir = path.join(repoRoot, "docs");

  const svgContent = qr.toSvg({
    sizePx: 320,
    margin: 4,
    darkColor: "#000000",
    lightColor: "#ffffff",
  });

  if (fs.existsSync(publicDir)) {
    const svgPath = path.join(publicDir, "demo-qr.svg");
    fs.writeFileSync(svgPath, svgContent, "utf8");
    process.stdout.write(
      `✓ SVG generado: ${path.relative(repoRoot, svgPath)}\n`,
    );
  }

  const htmlPoster = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Demostración Operativa — Código QR Mallplaza Copiapó</title>
  <style>
    :root {
      --primary: #bd1737;
      --primary-dark: #8c0f27;
      --bg: #f8fafc;
      --surface: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
    }
    .poster {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
      max-width: 480px;
      width: 100%;
      padding: 36px 32px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: #fee2e2;
      color: var(--primary-dark);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    .brand-mark {
      font-size: 28px;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 6px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .qr-container {
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      border: 2px dashed var(--border);
      display: inline-block;
      margin-bottom: 20px;
    }
    .url-box {
      background: #f1f5f9;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      color: var(--text);
      word-break: break-all;
      margin-bottom: 20px;
    }
    .instructions {
      text-align: left;
      background: #f8fafc;
      border-left: 3px solid var(--primary);
      padding: 12px 16px;
      font-size: 13px;
      line-height: 1.5;
      color: var(--muted);
      margin-bottom: 24px;
      border-radius: 0 8px 8px 0;
    }
    .instructions strong { color: var(--text); }
    .instructions ol { margin-left: 20px; margin-top: 6px; }
    .disclaimer {
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .poster { border: none; box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="poster">
    <div class="brand-mark">MALLPLAZA</div>
    <span class="badge">Demostración Operativa</span>
    <h1>Reporte de Incidencias</h1>
    <p class="subtitle">Escanea este código con tu teléfono móvil para acceder directamente al formulario de reporte en terreno.</p>
    
    <div class="qr-container">
      ${svgContent}
    </div>

    <div class="url-box">${targetUrl}</div>

    <div class="instructions">
      <strong>Instrucciones para la demostración:</strong>
      <ol>
        <li>Conecta el dispositivo móvil a la misma red Wi-Fi o red local.</li>
        <li>Abre la cámara y enfoca el código QR.</li>
        <li>Abre el enlace para completar el formulario con el RUT sintético de prueba.</li>
      </ol>
    </div>

    <div class="disclaimer">
      Prototipo de sistema web local — Mallplaza Copiapó. Fines de evaluación académica. No envía información operativa real.
    </div>
  </div>
</body>
</html>`;

  const htmlPath = path.join(docsDir, "demo-qr.html");
  fs.writeFileSync(htmlPath, htmlPoster, "utf8");
  process.stdout.write(
    `✓ Ficha HTML generada: ${path.relative(repoRoot, htmlPath)}\n`,
  );
  process.stdout.write(
    "\nPara abrir en navegador: xdg-open docs/demo-qr.html (o abrir directamente el archivo en Windows/navegador)\n",
  );
}

main();
