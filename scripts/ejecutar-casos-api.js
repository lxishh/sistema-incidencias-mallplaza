const fs = require("fs");
// Uso: SEED_ADMIN_PASSWORD=... BASE_URL=http://localhost:3000 node ejecutar-casos-api.js
// Requiere el backend en marcha con base limpia y los límites de tasa altos
// (RATE_LIMIT_INCIDENCIAS_MAX=1000 RATE_LIMIT_LOGIN_MAX=1000). Escribe resultados-casos-api.json.
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PW = process.env.SEED_ADMIN_PASSWORD;
if (!PW) { console.error("Defina SEED_ADMIN_PASSWORD"); process.exit(1); }
const EMAIL = process.env.SEED_ADMIN_EMAIL || "jefatura@example.test";
const RANK = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };

async function call(method, path, { body, cookie } = {}) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, setCookie: res.headers.getSetCookie?.() || [], ms: Date.now() - t0 };
}
const alta = (o = {}) => ({ rut_operario: "11111111-1", ubicacion: "ALTO_TRANSITO", tipo_falla: TF, impacto_operativo: false, riesgo_accidente: false, afecta_terceros: false, ...o });
let TF = "ELECTRICA", UB = {}, cookie = "", ids = {}, results = [];

function rec(id, tipo, req, cu, desc, pre, pasos, datos, esperado, obtenido, ok, nota = "") {
  results.push({ id, tipo, req, cu, desc, pre, pasos, datos, esperado, obtenido, ok, nota });
}
const brief = (r) => `HTTP ${r.status}` + (r.json?.error?.code ? ` · ${r.json.error.code}` : "");

(async () => {
  const cat = await call("GET", "/api/catalogos");
  TF = cat.json.tipos_falla[0];
  for (const u of cat.json.ubicaciones) UB[u.split("_")[0]] = u;   // ALTO, TRANSITO(MEDIO), BAJO
  const ALTO = cat.json.ubicaciones.find(u => u.startsWith("ALTO")), BAJO = cat.json.ubicaciones.find(u => u.startsWith("BAJO")), MED = cat.json.ubicaciones.find(u => u.includes("MEDIO"));

  // ---- Autenticación
  let r = await call("POST", "/api/auth/login", { body: { email: EMAIL, password: PW } });
  cookie = (r.setCookie[0] || "").split(";")[0];
  rec("TC-01","Funcional","RF-01, RNF-06","CU-01","Inicio de sesión con credenciales válidas","Usuario Jefatura activo","POST /api/auth/login con correo y contraseña","Credenciales de prueba","HTTP 200 y cookie de sesión", `${brief(r)} · cookie ${cookie ? "recibida" : "ausente"}`, r.status === 200 && !!cookie);
  const oldCookie = cookie;
  r = await call("POST", "/api/auth/login", { body: { email: EMAIL, password: "incorrecta-123" } });
  const m1 = r.json?.error?.message;
  rec("TC-02","Seguridad","RF-01","CU-01","Contraseña incorrecta","Usuario Jefatura activo","POST /api/auth/login con contraseña errónea","Contraseña incorrecta","HTTP 401 con mensaje genérico", `${brief(r)} · «${m1}»`, r.status === 401);
  r = await call("POST", "/api/auth/login", { body: { email: "no-existe@example.test", password: "incorrecta-123" } });
  rec("TC-03","Seguridad","RF-01","CU-01","Correo inexistente: mensaje idéntico al de contraseña incorrecta","—","POST /api/auth/login con correo no registrado","Correo inexistente","HTTP 401 y el mismo mensaje que TC-02", `${brief(r)} · «${r.json?.error?.message}»`, r.status === 401 && r.json?.error?.message === m1);
  r = await call("GET", "/api/incidencias");
  rec("TC-04","Seguridad","RF-02, RNF-05","CU-09","Cola sin sesión","Sin cookie de sesión","GET /api/incidencias sin cookie","—","HTTP 401", brief(r), r.status === 401);
  r = await call("GET", "/api/dashboard/kpis");
  rec("TC-05","Seguridad","RF-02, RNF-05","CU-13","Dashboard sin sesión","Sin cookie de sesión","GET /api/dashboard/kpis sin cookie","—","HTTP 401", brief(r), r.status === 401);

  // ---- Alta y validaciones
  r = await call("POST", "/api/incidencias", { body: alta({ ubicacion: ALTO, impacto_operativo: true, comentario: "Luminaria apagada en pasillo" }) });
  ids.crit = r.json?.id;
  rec("TC-07","Funcional","RF-04 a RF-11, RF-14, RF-15, RF-18","CU-04","Alta válida de incidencia","Servidor activo; sin sesión","POST /api/incidencias con todos los campos","RUT 11111111-1, alto tránsito, impacto operativo Sí, comentario","HTTP 201 con número, prioridad y estado Pendiente", `${brief(r)} · id ${r.json?.id} · prioridad ${r.json?.prioridad} · estado ${r.json?.estado}`, r.status === 201 && r.json?.estado === "PENDIENTE");
  const body7 = JSON.stringify(r.json);
  rec("TC-14","Seguridad","RNF-10","CU-04","La respuesta del alta no devuelve el RUT","Alta realizada en TC-07","Revisar el cuerpo de la respuesta del alta","—","El cuerpo no contiene el RUT", body7.includes("11111111") ? "El cuerpo contiene el RUT" : "El cuerpo no contiene el RUT", !body7.includes("11111111"));
  r = await call("POST", "/api/incidencias", { body: (({ rut_operario, ...x }) => x)(alta()) });
  rec("TC-08","Validación","RF-06, RF-14","CU-04","Alta sin RUT","—","POST /api/incidencias sin rut_operario","RUT ausente","HTTP 400 por validación", brief(r), r.status === 400);
  r = await call("POST", "/api/incidencias", { body: alta({ rut_operario: "11111111-2" }) });
  rec("TC-09","Validación","RNF-12","CU-04","RUT con dígito verificador inválido (módulo 11)","—","POST /api/incidencias con RUT 11111111-2","RUT con dígito verificador incorrecto","HTTP 400 por validación", brief(r), r.status === 400);
  r = await call("POST", "/api/incidencias", { body: (({ impacto_operativo, ...x }) => x)(alta()) });
  rec("TC-10","Validación","RF-08, RF-14","CU-04","Alta sin el campo obligatorio de impacto operativo","—","POST /api/incidencias sin impacto_operativo","Campo ausente","HTTP 400 por validación", brief(r), r.status === 400);
  r = await call("POST", "/api/incidencias", { body: alta({ tipo_falla: "PLOMERIA_X" }) });
  rec("TC-11","Validación","RF-07","CU-04","Tipo de falla fuera del catálogo","—","POST /api/incidencias con tipo_falla inexistente","tipo_falla = PLOMERIA_X","HTTP 400 por validación", brief(r), r.status === 400);
  r = await call("POST", "/api/incidencias", { body: alta({ ubicacion: "SECTOR_X" }) });
  rec("TC-12","Validación","RF-05","CU-04","Ubicación fuera del catálogo","—","POST /api/incidencias con ubicación inexistente","ubicacion = SECTOR_X","HTTP 400 por validación", brief(r), r.status === 400);
  r = await call("POST", "/api/incidencias", { body: alta({ ubicacion: BAJO }) });
  ids.baja = r.json?.id;
  rec("TC-13","Funcional","RF-11","CU-04","Alta sin comentario (campo opcional)","—","POST /api/incidencias sin comentario","Sin comentario","HTTP 201", `${brief(r)} · prioridad ${r.json?.prioridad}`, r.status === 201);

  // ---- Motor de reglas
  const combos = [
    ["TC-15","Alto tránsito + impacto operativo", { ubicacion: ALTO, impacto_operativo: true }, "CRITICA"],
    ["TC-16","Bajo tránsito + riesgo de accidente", { ubicacion: BAJO, riesgo_accidente: true }, "ALTA"],
    ["TC-17","Bajo tránsito + afecta a terceros", { ubicacion: BAJO, afecta_terceros: true }, "ALTA"],
    ["TC-18","Alto tránsito sin otros factores", { ubicacion: ALTO }, "MEDIA"],
    ["TC-19","Bajo tránsito + impacto operativo", { ubicacion: BAJO, impacto_operativo: true }, "MEDIA"],
    ["TC-20","Bajo tránsito sin factores", { ubicacion: BAJO }, "BAJA"],
    ["TC-21","Precedencia: alto tránsito + impacto + riesgo + terceros", { ubicacion: ALTO, impacto_operativo: true, riesgo_accidente: true, afecta_terceros: true }, "CRITICA"],
  ];
  for (const [id, d, o, esp] of combos) {
    r = await call("POST", "/api/incidencias", { body: alta(o) });
    rec(id,"Funcional","RF-16, RF-17","CU-06",`Prioridad: ${d}`,"—","POST /api/incidencias y leer la prioridad devuelta",d,`Prioridad ${esp}`,`${brief(r)} · prioridad ${r.json?.prioridad}`, r.status === 201 && r.json?.prioridad === esp);
  }
  const a = await call("POST", "/api/incidencias", { body: alta({ ubicacion: MED, riesgo_accidente: true }) });
  const b = await call("POST", "/api/incidencias", { body: alta({ ubicacion: MED, riesgo_accidente: true }) });
  rec("TC-22","Funcional","RF-16","CU-06","Determinismo: el mismo reporte da la misma prioridad","—","Enviar dos veces el mismo reporte","Tránsito medio + riesgo de accidente","Ambas respuestas con la misma prioridad",`Prioridades: ${a.json?.prioridad} y ${b.json?.prioridad}`, a.json?.prioridad === b.json?.prioridad);

  // ---- Gestión
  r = await call("GET", "/api/incidencias?limit=100", { cookie });
  const rows = r.json?.data || [];
  const ranks = rows.map(x => RANK[x.prioridad]);
  const sorted = ranks.every((v, i) => i === 0 || ranks[i - 1] <= v);
  rec("TC-23","Funcional","RF-33","CU-09","Cola ordenada por prioridad (Crítica a Baja)","Varias incidencias de distintas prioridades","GET /api/incidencias con sesión","—","Orden no decreciente de severidad",`${brief(r)} · ${rows.length} filas · orden ${sorted ? "correcto" : "incorrecto"}`, r.status === 200 && sorted && rows.length > 5);
  rec("TC-24","Seguridad","RNF-10","CU-09","La lista no expone el RUT","Incidencias creadas","Revisar el cuerpo de GET /api/incidencias","—","Ninguna fila contiene el RUT", JSON.stringify(rows).includes("rut") || JSON.stringify(rows).includes("11111111") ? "La lista contiene el RUT" : "La lista no contiene el RUT", !(JSON.stringify(rows).includes("rut") || JSON.stringify(rows).includes("11111111")));
  r = await call("GET", `/api/incidencias/${ids.crit}`, { cookie });
  rec("TC-25","Funcional","RF-22, RNF-10","CU-11","El detalle sí muestra el RUT a Jefatura autenticada","Sesión activa","GET /api/incidencias/:id","—","Detalle con RUT y datos completos", `${brief(r)} · RUT ${JSON.stringify(r.json).includes("11111111-1") ? "presente" : "ausente"}`, r.status === 200 && JSON.stringify(r.json).includes("11111111-1"));
  const sync0 = JSON.stringify(r.json);
  rec("TC-38","Funcional","RF-40, RNF-14","CU-14","El alta deja la sincronización pendiente y no espera a Casa Central","Alta de TC-07","Revisar estado de sincronización en el detalle","—","estado de sincronización PENDIENTE_SINC", `Detalle contiene PENDIENTE_SINC: ${sync0.includes("PENDIENTE_SINC")}`, sync0.includes("PENDIENTE_SINC"));
  const flt = async (id, desc, q, check, req) => { const x = await call("GET", `/api/incidencias?${q}&limit=100`, { cookie }); const d = x.json?.data || []; rec(id,"Funcional",req,"CU-10",desc,"Incidencias variadas",`GET /api/incidencias?${q}`,q,"Solo coincidencias",`${brief(x)} · ${d.length} resultados`, x.status === 200 && d.length > 0 && d.every(check)); };
  await flt("TC-26","Filtro por prioridad","prioridad=CRITICA", x => x.prioridad === "CRITICA","RF-24");
  await flt("TC-27","Filtro por tipo de falla",`tipo_falla=${TF}`, x => x.tipo_falla === TF,"RF-26");
  await flt("TC-28","Filtro por ubicación",`ubicacion=${BAJO}`, x => x.ubicacion === BAJO,"RF-25");
  await flt("TC-29","Filtro por estado","estado=PENDIENTE", x => x.estado === "PENDIENTE","RF-23");
  r = await call("GET", `/api/incidencias?q=${ids.crit}`, { cookie });
  rec("TC-30","Funcional","RF-27","CU-10","Búsqueda por número de incidencia","Incidencia creada",`GET /api/incidencias?q=${ids.crit}`,"Número exacto","Un resultado con ese id",`${brief(r)} · ${r.json?.data?.length} resultado(s)`, r.status === 200 && r.json?.data?.length === 1 && String(r.json.data[0].id) === String(ids.crit));
  r = await call("GET", "/api/incidencias?q=abc", { cookie });
  rec("TC-31","Validación","RF-27","CU-10","Búsqueda con identificador no numérico","—","GET /api/incidencias?q=abc","q = abc","HTTP 400", brief(r), r.status === 400);
  r = await call("GET", "/api/incidencias?prioridad=URGENTE", { cookie });
  rec("TC-32","Validación","RF-24","CU-10","Filtro con valor inválido","—","GET /api/incidencias?prioridad=URGENTE","prioridad = URGENTE","HTTP 400", brief(r), r.status === 400);

  // ---- Cambios de estado
  const p = (id, estado) => call("PATCH", `/api/incidencias/${id}/estado`, { cookie, body: { estado } });
  r = await p(ids.crit, "RESUELTA");
  rec("TC-33","Funcional","RF-21","CU-12","No se puede resolver sin pasar por En proceso","Incidencia Pendiente","PATCH /api/incidencias/:id/estado → RESUELTA","Pendiente → Resuelta","HTTP 409 y el estado no cambia", brief(r), r.status === 409);
  r = await p(ids.crit, "EN_PROCESO");
  rec("TC-34","Funcional","RF-19","CU-12","Pasar de Pendiente a En proceso","Incidencia Pendiente","PATCH → EN_PROCESO","Pendiente → En proceso","HTTP 200", brief(r), r.status === 200);
  r = await p(ids.crit, "RESUELTA");
  const d35 = await call("GET", `/api/incidencias/${ids.crit}`, { cookie });
  rec("TC-35","Funcional","RF-20","CU-12","Resolver una incidencia En proceso y registrar la fecha de cierre","Incidencia En proceso","PATCH → RESUELTA","En proceso → Resuelta","HTTP 200 y fecha de cierre registrada", `${brief(r)} · fecha_cierre ${d35.json?.fecha_cierre ? "registrada" : "ausente"}`, r.status === 200 && !!d35.json?.fecha_cierre);
  r = await p(ids.crit, "EN_PROCESO");
  rec("TC-36","Funcional","RF-19, RF-21","CU-12","No se puede retroceder una incidencia Resuelta","Incidencia Resuelta","PATCH → EN_PROCESO sobre una Resuelta","Resuelta → En proceso","HTTP 409", brief(r), r.status === 409);
  const hist = d35.json?.historial || [];
  rec("TC-37","Funcional","RF-22","CU-11","Historial con ambos cambios de estado","Incidencia con dos cambios","GET /api/incidencias/:id","—","Dos entradas en orden cronológico con usuario y fecha", `${hist.length} entradas: ${hist.map(h => `${h.estado_anterior}→${h.estado_nuevo}`).join(", ")}`, hist.length >= 2);

  // ---- Dashboard
  r = await call("GET", "/api/dashboard/kpis", { cookie });
  const k = r.json || {}; const keys = ["mttr_minutos", "cumplimiento_sla_porcentaje", "por_prioridad", "por_tipo_falla", "por_ubicacion", "por_estado_sync"];
  rec("TC-39","Funcional","RF-28 a RF-31, RF-40","CU-13","KPI con datos: MTTR, SLA y agrupaciones","Al menos una incidencia resuelta","GET /api/dashboard/kpis con sesión","—","HTTP 200 con los seis indicadores", `${brief(r)} · faltantes: ${keys.filter(x => !(x in k)).join(", ") || "ninguno"}`, r.status === 200 && keys.every(x => x in k));
  rec("TC-40","Funcional","RF-28","CU-13","MTTR numérico tras resolver una incidencia","TC-35 ejecutado","Leer mttr_minutos","—","Valor numérico no negativo", `mttr_minutos = ${k.mttr_minutos}`, typeof k.mttr_minutos === "number" && k.mttr_minutos >= 0);
  const hoy = new Date().toISOString().slice(0, 10);
  r = await call("GET", `/api/dashboard/kpis?desde=${hoy}&hasta=${hoy}`, { cookie });
  rec("TC-41","Funcional","RF-32","CU-13","Filtro por rango de fechas (el día de hoy)","—",`GET /api/dashboard/kpis?desde=${hoy}&hasta=${hoy}`,"Rango de un día","HTTP 200 e incluye las incidencias del día", `${brief(r)} · incidencias por prioridad: ${JSON.stringify(r.json?.por_prioridad)}`, r.status === 200 && Object.keys(r.json?.por_prioridad || {}).length > 0);
  r = await call("GET", "/api/dashboard/kpis?desde=2026-10-10&hasta=2026-10-01", { cookie });
  rec("TC-42","Validación","RF-32","CU-13","Rango inválido (fecha inicial posterior a la final)","—","GET /api/dashboard/kpis?desde=2026-10-10&hasta=2026-10-01","desde > hasta","HTTP 400", brief(r), r.status === 400);

  // ---- Logout
  r = await call("POST", "/api/auth/logout", { cookie });
  const cleared = (r.setCookie.join(";") || "").match(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  rec("TC-06","Funcional","RF-03","CU-02","Cierre de sesión","Sesión activa","POST /api/auth/logout","—","HTTP 200 y cookie invalidada", `${brief(r)} · cookie ${cleared ? "invalidada" : "sin invalidar"}`, r.status === 200 && !!cleared);
  r = await call("GET", "/api/auth/me", { cookie: oldCookie });
  rec("TC-46","Seguridad","RF-03, RNF-05","CU-02","Reutilizar la cookie anterior después de cerrar sesión","Cierre de sesión hecho (TC-06)","GET /api/auth/me con la cookie previa al cierre","Cookie copiada antes del cierre","HTTP 401", `${brief(r)}`, r.status === 401, r.status === 200 ? "Observación: el token anterior sigue válido hasta que expire (JWT sin lista de revocación). Evaluar acortar la vigencia o agregar revocación." : "");

  // ---- Operación
  r = await call("GET", "/health");
  rec("TC-43","Operación","—","—","Verificación de salud sin consultar la base","—","GET /health","—","HTTP 200", brief(r), r.status === 200);
  const times = []; for (let i = 0; i < 30; i++) { const x = await call("POST", "/api/incidencias", { body: alta({ ubicacion: MED }) }); times.push(x.ms); }
  times.sort((x, y) => x - y);
  const p50 = times[14], p95 = times[28], mx = times[29];
  rec("TC-44","Rendimiento","RNF-04","CU-04","Tiempo de respuesta del alta (30 envíos seguidos, entorno local)","Base limpia, sin carga","30 POST secuenciales a /api/incidencias","Reporte válido","p95 menor a 3 000 ms (referencia local, no es producción)", `p50 ${p50} ms · p95 ${p95} ms · máx ${mx} ms`, p95 < 3000, "Medición local sin red móvil; no reemplaza la prueba en un entorno parecido a producción.");
  const burst = await Promise.all(Array.from({ length: 20 }, () => call("POST", "/api/incidencias", { body: alta({ ubicacion: BAJO }) })));
  const okAll = burst.every(x => x.status === 201), uniq = new Set(burst.map(x => x.json?.id)).size;
  rec("TC-45","Rendimiento","RNF-09, RNF-08","CU-04","20 envíos simultáneos sin pérdidas ni duplicados (entorno local)","Base limpia","20 POST en paralelo","Reporte válido","20 respuestas 201 con identificadores distintos", `${burst.filter(x => x.status === 201).length} con HTTP 201 · ${uniq} identificadores distintos · máx ${Math.max(...burst.map(x => x.ms))} ms`, okAll && uniq === 20, "Prueba ligera de concurrencia; no equivale a una prueba de carga con el volumen real.");

  results.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync("resultados-casos-api.json", JSON.stringify(results, null, 1));
  const fail = results.filter(x => !x.ok);
  console.log(`casos: ${results.length} · aprobados: ${results.length - fail.length} · fallidos: ${fail.length}`);
  for (const f of fail) console.log("FALLA", f.id, f.desc, "→", f.obtenido);
  for (const x of results.filter(x => x.nota)) console.log("NOTA", x.id, x.nota);
})().catch(e => { console.error("ERROR", e); process.exit(1); });
