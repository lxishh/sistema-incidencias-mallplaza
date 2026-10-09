import "./styles.css";
import { registerSW } from "virtual:pwa-register";

const app = document.querySelector("#app");
const state = {
  catalogs: null,
  catalogError: "",
  user: null,
  filters: {},
  page: 1,
  limit: 20,
  total: 0,
  incidents: [],
  kpis: null,
  kpiError: "",
  kpiRange: null,
  detail: null,
  error: "",
  success: null,
  loading: false,
};

const labels = {
  ubicacion: {
    ALTO_TRANSITO: "Alto tránsito",
    TRANSITO_MEDIO: "Tránsito medio",
    BAJO_TRANSITO: "Bajo tránsito",
  },
  tipo_falla: {
    ELECTRICA: "Eléctrica",
    SANITARIA_AGUA: "Sanitaria / agua",
    ESTRUCTURAL: "Estructural",
    ESTETICA_CONFORT: "Estética / confort",
    MOBILIARIO: "Mobiliario",
  },
  prioridad: {
    CRITICA: "Crítica",
    ALTA: "Alta",
    MEDIA: "Media",
    BAJA: "Baja",
  },
  estado: {
    PENDIENTE: "Pendiente",
    EN_PROCESO: "En proceso",
    RESUELTA: "Resuelta",
  },
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      body?.error?.message || "No se pudo completar la solicitud.",
    );
    error.status = response.status;
    error.code = body?.error?.code;
    error.details = body?.error?.details || [];
    throw error;
  }
  return body;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function pageShell(content, active = "report") {
  const reportActive = active === "report" ? "is-active" : "";
  const manageActive = active === "manage" ? "is-active" : "";
  return `
    <header class="topbar">
      <a class="brand" href="#/report" aria-label="Mallplaza Copiapó, inicio">
        <span class="brand-mark" aria-hidden="true">M</span>
        <span class="brand-text"><strong>Mallplaza</strong><small>Copiapó · Incidencias</small></span>
      </a>
      <nav class="main-nav" aria-label="Navegación principal">
        <a class="nav-link ${reportActive}" href="#/report">Reportar</a>
        <a class="nav-link ${manageActive}" href="#/manage">Jefatura</a>
      </nav>
      <span class="prototype-tag"><span></span> Prototipo local</span>
    </header>
    <main id="main-content" class="page-content">${content}</main>
    <footer class="site-footer"><span>Gestión de incidencias operativas</span><span>Prototipo académico · Datos de prueba</span></footer>
    <div id="toast-region" class="sr-only" aria-live="polite" aria-atomic="true"></div>
  `;
}

function optionList(items, selected, lookup) {
  return items
    .map(
      (item) =>
        `<option value="${escapeHtml(item)}" ${item === selected ? "selected" : ""}>${escapeHtml(lookup[item] || item)}</option>`,
    )
    .join("");
}

function booleanChoices(name, label) {
  return `
    <fieldset class="boolean-field">
      <legend>${label} <span class="required-mark">*</span></legend>
      <div class="choice-row">
        <label class="choice"><input type="radio" name="${name}" value="true" required /><span>Sí</span></label>
        <label class="choice"><input type="radio" name="${name}" value="false" required /><span>No</span></label>
      </div>
    </fieldset>`;
}

function renderReport() {
  const catalogMessage = state.catalogError
    ? `<div class="notice notice-error" role="alert">${escapeHtml(state.catalogError)}</div>`
    : "";
  const success = state.success
    ? `<section class="success-card" role="status">
        <span class="success-icon" aria-hidden="true">✓</span>
        <div><p class="eyebrow">Reporte recibido</p><h2>Incidencia #${escapeHtml(state.success.id)}</h2>
          <p>Prioridad <strong>${escapeHtml(labels.prioridad[state.success.prioridad] || state.success.prioridad)}</strong> · estado ${escapeHtml(labels.estado[state.success.estado] || state.success.estado)}.</p>
          <p class="muted">El prototipo guardó el reporte localmente. La sincronización institucional se muestra como pendiente.</p>
        </div>
        <button class="button button-secondary" type="button" data-action="new-report">Crear otro</button>
      </section>`
    : "";

  const catalogs = state.catalogs;
  const form = !state.success
    ? `<section class="form-card">
        <div class="section-heading">
          <div><p class="eyebrow">Reporte operacional</p><h2>¿Qué ocurrió?</h2><p class="muted">Completa los datos para registrar la incidencia. Los campos con * son obligatorios.</p></div>
          <span class="step-badge">01 <span>/</span> 01</span>
        </div>
        ${state.error ? `<div class="notice notice-error" role="alert">${escapeHtml(state.error)}</div>` : ""}
        <form id="incident-form" novalidate>
          <div class="form-grid">
            <label class="field"><span>RUT del operario <b>*</b></span><input name="rut_operario" type="text" inputmode="text" autocomplete="off" placeholder="12345678-5" maxlength="10" pattern="[0-9]{7,8}-[0-9Kk]" required aria-describedby="rut-help" /><small id="rut-help">Formato: 12345678-5. Se valida el dígito verificador al enviar.</small></label>
            <label class="field"><span>Ubicación <b>*</b></span><select name="ubicacion" required ${catalogs ? "" : "disabled"}><option value="">Selecciona una ubicación</option>${catalogs ? optionList(catalogs.ubicaciones, "", labels.ubicacion) : ""}</select></label>
            <label class="field"><span>Tipo de falla <b>*</b></span><select name="tipo_falla" required ${catalogs ? "" : "disabled"}><option value="">Selecciona un tipo</option>${catalogs ? optionList(catalogs.tipos_falla, "", labels.tipo_falla) : ""}</select></label>
            <label class="field field-wide"><span>Comentario <small>(opcional)</small></span><textarea name="comentario" rows="3" maxlength="1000" placeholder="Agrega detalles útiles para atender la incidencia…"></textarea><small class="counter"><span id="comment-count">0</span> / 1000</small></label>
          </div>
          <div class="impact-grid">
            ${booleanChoices("impacto_operativo", "¿Afecta la operación?")}
            ${booleanChoices("riesgo_accidente", "¿Existe riesgo de accidente?")}
            ${booleanChoices("afecta_terceros", "¿Afecta a clientes u otras personas?")}
          </div>
          <div class="form-actions"><p class="privacy-note"><span aria-hidden="true">◈</span> El RUT se usa para registrar el reporte y no se muestra en listados públicos.</p><button class="button button-primary" type="submit" ${catalogs ? "" : "disabled"}>Enviar incidencia <span aria-hidden="true">→</span></button></div>
        </form>
      </section>`
    : "";

  app.innerHTML = pageShell(`
    <section class="hero hero-report">
      <div class="hero-copy"><p class="eyebrow eyebrow-light">Centro de operaciones · Copiapó</p><h1>Reporta una incidencia<br /><em>en pocos pasos.</em></h1><p>Ayúdanos a mantener una operación segura y en buen estado. Registra una falla para que Jefatura pueda priorizarla y darle seguimiento.</p></div>
      <div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-card"><span class="art-spark">✳</span><span>Reporte<br />recibido</span><b>✓</b></div><div class="art-dot dot-one"></div><div class="art-dot dot-two"></div><div class="art-dot dot-three"></div></div>
    </section>
    <div class="content-narrow">${catalogMessage}${success}${form}<p class="form-footnote">Este formulario forma parte de un prototipo académico local. No usar para reportes operativos reales.</p></div>
  `);

  const comment = document.querySelector('[name="comentario"]');
  comment?.addEventListener("input", () => {
    document.querySelector("#comment-count").textContent = String(
      comment.value.length,
    );
  });
}

function renderLogin() {
  app.innerHTML = pageShell(
    `<section class="login-layout">
      <div class="login-aside"><p class="eyebrow eyebrow-light">Panel de gestión</p><h1>Una vista clara<br />para cada <em>prioridad.</em></h1><p>Ingresa con la cuenta de Jefatura para revisar la cola y actualizar el estado de las incidencias.</p><div class="login-aside-note"><span>01</span><p>La prioridad se calcula de forma automática según las reglas del proyecto.</p></div></div>
      <div class="login-card"><div class="login-icon" aria-hidden="true">↗</div><p class="eyebrow">Acceso de Jefatura</p><h2>Iniciar sesión</h2><p class="muted">Usa las credenciales de desarrollo configuradas para este prototipo.</p>
        ${state.error ? `<div class="notice notice-error" role="alert">${escapeHtml(state.error)}</div>` : ""}
        <form id="login-form"><label class="field"><span>Correo electrónico</span><input type="email" name="email" autocomplete="username" required maxlength="254" placeholder="jefatura@mallplaza.cl" /></label><label class="field"><span>Contraseña</span><input type="password" name="password" autocomplete="current-password" required maxlength="200" placeholder="••••••••••••" /></label><button class="button button-primary button-full" type="submit">Entrar al panel <span aria-hidden="true">→</span></button></form>
        <p class="login-disclaimer">El acceso es para demostración local. No se validan cuentas corporativas.</p>
      </div>
    </section>`,
    "manage",
  );
}

function selectFilter(name, title, values, lookup, selected) {
  return `<label class="filter-field"><span>${title}</span><select name="${name}"><option value="">Todas</option>${optionList(values, selected, lookup)}</select></label>`;
}

function renderIncidentRows() {
  if (state.loading)
    return `<tr><td colspan="6" class="empty-state">Cargando incidencias…</td></tr>`;
  if (state.incidents.length === 0)
    return `<tr><td colspan="6" class="empty-state"><span class="empty-icon">⌕</span><strong>No hay incidencias para mostrar</strong><small>Prueba con otros filtros o registra un nuevo reporte.</small></td></tr>`;
  return state.incidents
    .map(
      (item) => `
        <tr>
          <td><button class="id-link" type="button" data-open="${escapeHtml(item.id)}">#${escapeHtml(item.id)}</button></td>
          <td><span class="priority-pill priority-${item.prioridad.toLowerCase()}"><i></i>${escapeHtml(labels.prioridad[item.prioridad] || item.prioridad)}</span></td>
          <td><span class="cell-main">${escapeHtml(labels.tipo_falla[item.tipo_falla] || item.tipo_falla)}</span><small>${escapeHtml(labels.ubicacion[item.ubicacion] || item.ubicacion)}</small></td>
          <td><span class="status-pill status-${item.estado.toLowerCase()}">${escapeHtml(labels.estado[item.estado] || item.estado)}</span></td>
          <td>${escapeHtml(formatDate(item.fecha_creacion))}</td>
          <td><button class="icon-button" type="button" data-open="${escapeHtml(item.id)}" aria-label="Ver detalle de incidencia ${escapeHtml(item.id)}">↗</button></td>
        </tr>`,
    )
    .join("");
}

function renderDetail() {
  const item = state.detail;
  if (!item) return "";
  const nextState =
    item.estado === "PENDIENTE"
      ? "EN_PROCESO"
      : item.estado === "EN_PROCESO"
        ? "RESUELTA"
        : null;
  const actionLabel =
    nextState === "EN_PROCESO"
      ? "Iniciar atención"
      : nextState === "RESUELTA"
        ? "Marcar como resuelta"
        : "";
  const history = (item.historial || [])
    .map(
      (entry) => `<li class="timeline-item"><span class="timeline-dot"></span><div><strong>${entry.estado_anterior ? `${escapeHtml(labels.estado[entry.estado_anterior] || entry.estado_anterior)} → ` : "Reporte creado · "}${escapeHtml(labels.estado[entry.estado_nuevo] || entry.estado_nuevo)}</strong><small>${escapeHtml(formatDate(entry.fecha))}${entry.usuario ? ` · ${escapeHtml(entry.usuario)}` : " · Operario"}</small></div></li>`,
    )
    .join("");
  return `<div class="modal-backdrop" data-action="close-detail"><section class="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title" data-detail-panel>
    <div class="detail-header"><div><p class="eyebrow">Detalle de incidencia</p><h2 id="detail-title">#${escapeHtml(item.id)}</h2></div><button class="icon-button close-button" data-action="close-detail" type="button" aria-label="Cerrar detalle">×</button></div>
    <div class="detail-status"><span class="priority-pill priority-${item.prioridad.toLowerCase()}"><i></i>${escapeHtml(labels.prioridad[item.prioridad] || item.prioridad)}</span><span class="status-pill status-${item.estado.toLowerCase()}">${escapeHtml(labels.estado[item.estado] || item.estado)}</span></div>
    <dl class="detail-grid"><div><dt>Tipo de falla</dt><dd>${escapeHtml(labels.tipo_falla[item.tipo_falla] || item.tipo_falla)}</dd></div><div><dt>Ubicación</dt><dd>${escapeHtml(labels.ubicacion[item.ubicacion] || item.ubicacion)}</dd></div><div><dt>Creada</dt><dd>${escapeHtml(formatDate(item.fecha_creacion))}</dd></div><div><dt>RUT del operario</dt><dd>${escapeHtml(item.rut_operario)}</dd></div><div><dt>Impacto operativo</dt><dd>${item.impacto_operativo ? "Sí" : "No"}</dd></div><div><dt>Riesgo de accidente</dt><dd>${item.riesgo_accidente ? "Sí" : "No"}</dd></div><div><dt>Afecta a terceros</dt><dd>${item.afecta_terceros ? "Sí" : "No"}</dd></div><div><dt>Sincronización</dt><dd>${escapeHtml(item.sync?.estado || item.estado_sync)}</dd></div></dl>
    <div class="detail-comment"><h3>Comentario</h3><p>${item.comentario ? escapeHtml(item.comentario) : "Sin comentario adicional."}</p></div>
    <div class="detail-history"><h3>Historial</h3><ol class="timeline">${history || "<li>Sin eventos registrados.</li>"}</ol></div>
    ${state.error ? `<div class="notice notice-error" role="alert">${escapeHtml(state.error)}</div>` : ""}
    <div class="detail-actions">${actionLabel ? `<button class="button button-primary button-full" type="button" data-transition="${nextState}"> ${actionLabel} <span aria-hidden="true">→</span></button>` : `<p class="resolved-note">Esta incidencia ya fue resuelta.</p>`}</div>
  </section></div>`;
}

function renderManagement() {
  if (!state.user) return renderLogin();
  const filters = state.filters;
  const start = state.total === 0 ? 0 : (state.page - 1) * state.limit + 1;
  const end = Math.min(state.page * state.limit, state.total);
  const pages = Math.max(1, Math.ceil(state.total / state.limit));
  app.innerHTML = pageShell(
    `<section class="manage-heading"><div><p class="eyebrow">Panel de gestión</p><h1>Hola, ${escapeHtml(state.user.nombre.split(" ")[0])}.</h1><p class="muted">Revisa la cola y mantén el seguimiento de cada incidencia.</p></div><div class="user-menu"><span class="avatar">${escapeHtml(state.user.nombre.trim().slice(0, 1).toUpperCase())}</span><span class="user-name">${escapeHtml(state.user.nombre)}<small>Jefatura</small></span><button class="button button-ghost" data-action="logout" type="button">Salir</button></div></section>
    ${state.error ? `<div class="notice notice-error" role="alert">${escapeHtml(state.error)}</div>` : ""}
    <section class="summary-strip"><div class="summary-intro"><span class="summary-icon">▤</span><div><strong>${state.total}</strong><small>incidencias encontradas</small></div></div><div class="summary-note"><span class="summary-dot"></span>Prioridad automática<span class="summary-divider">·</span>Ordenadas por prioridad y antigüedad</div></section>
    <section class="table-card"><div class="table-heading"><div><h2>Cola de incidencias</h2><p>Abre un registro para revisar los antecedentes y actualizar su estado.</p></div><button class="button button-secondary" data-action="refresh" type="button">↻ <span>Actualizar</span></button></div>
      <form class="filter-bar" id="filters-form">
        <label class="filter-field"><span>Buscar por ID</span><input type="search" name="q" value="${escapeHtml(filters.q || "")}" placeholder="Ej. 42" inputmode="numeric" /></label>
        ${selectFilter("estado", "Estado", ["PENDIENTE", "EN_PROCESO", "RESUELTA"], labels.estado, filters.estado)}
        ${selectFilter("prioridad", "Prioridad", ["CRITICA", "ALTA", "MEDIA", "BAJA"], labels.prioridad, filters.prioridad)}
        ${selectFilter("ubicacion", "Ubicación", state.catalogs?.ubicaciones || [], labels.ubicacion, filters.ubicacion)}
        <button class="button button-filter" type="submit">Filtrar</button>
        <button class="reset-link" type="button" data-action="clear-filters">Limpiar</button>
      </form>
      <div class="table-scroll"><table class="incidents-table"><thead><tr><th>ID</th><th>Prioridad</th><th>Falla / ubicación</th><th>Estado</th><th>Fecha de creación</th><th><span class="sr-only">Abrir detalle</span></th></tr></thead><tbody>${renderIncidentRows()}</tbody></table></div>
      <div class="pagination"><span>Mostrando ${start}–${end} de ${state.total}</span><div><button class="page-button" type="button" data-page="${state.page - 1}" ${state.page <= 1 ? "disabled" : ""} aria-label="Página anterior">←</button><span>Página ${state.page} de ${pages}</span><button class="page-button" type="button" data-page="${state.page + 1}" ${state.page >= pages ? "disabled" : ""} aria-label="Página siguiente">→</button></div></div>
    </section><p class="form-footnote">Panel de demostración local. Los datos deben ser ficticios.</p>${renderDetail()}`,
    "manage",
  );
  renderKpiPanel();
}

function renderKpiPanel() {
  const main = document.querySelector("#main-content");
  const heading = main?.querySelector(".manage-heading");
  if (!heading) return;
  const section = document.createElement("section");
  section.className = "kpi-section";
  const title = document.createElement("div");
  title.className = "kpi-heading";
  title.innerHTML = '<div><p class="eyebrow">Indicadores de operación</p><h2>Resumen del período</h2></div>';
  const form = document.createElement("form");
  form.id = "kpi-range-form";
  form.className = "kpi-range";
  for (const [name, label] of [["desde", "Desde"], ["hasta", "Hasta"]]) {
    const field = document.createElement("label");
    field.textContent = label;
    const input = document.createElement("input");
    input.type = "date";
    input.name = name;
    input.value = state.kpiRange?.[name] || "";
    field.append(input);
    form.append(field);
  }
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.className = "button button-secondary";
  apply.textContent = "Aplicar";
  form.append(apply);
  title.append(form);
  section.append(title);

  if (state.kpiError) {
    const notice = document.createElement("div");
    notice.className = "notice notice-error";
    notice.setAttribute("role", "alert");
    notice.textContent = state.kpiError;
    section.append(notice);
  }
  const data = state.kpis;
  const cards = document.createElement("div");
  cards.className = "kpi-grid";
  const metricCards = [
    ["Total del período", data ? String(data.total) : "—", data ? `${data.abiertas} abiertas · ${data.resueltas} resueltas` : "Cargando indicadores…"],
    ["MTTR de resolución", data?.mttr_minutos == null ? "—" : `${data.mttr_minutos} min`, "Promedio desde creación hasta cierre"],
    ["Cumplimiento SLA", data?.cumplimiento_sla_porcentaje == null ? "—" : `${data.cumplimiento_sla_porcentaje}%`, data ? `${data.resueltas_en_sla} de ${data.resueltas} dentro del objetivo` : "Cargando indicadores…"],
    ["Abiertas vencidas", data ? String(data.abiertas_vencidas) : "—", "Según SLA de resolución por prioridad"],
  ];
  for (const [label, value, note] of metricCards) {
    const card = document.createElement("article");
    card.className = `kpi-card${label === "Abiertas vencidas" ? " kpi-warning" : ""}`;
    const caption = document.createElement("span");
    caption.textContent = label;
    const number = document.createElement("strong");
    number.textContent = value;
    const detail = document.createElement("small");
    detail.textContent = note;
    card.append(caption, number, detail);
    cards.append(card);
  }
  section.append(cards);

  const lookup = { ...labels.prioridad, ...labels.tipo_falla, ...labels.ubicacion };
  const groups = [
    ["Por prioridad", data?.por_prioridad],
    ["Por tipo de falla", data?.por_tipo_falla],
    ["Por ubicación", data?.por_ubicacion],
    ["Sincronización", data?.por_estado_sync],
  ];
  const distributions = document.createElement("div");
  distributions.className = "distribution-grid";
  for (const [headingText, values] of groups) {
    const card = document.createElement("article");
    card.className = "distribution-card";
    const cardTitle = document.createElement("h3");
    cardTitle.textContent = headingText;
    card.append(cardTitle);
    const entries = Object.entries(values || {});
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = data ? "Sin registros en este período." : "Cargando…";
      card.append(empty);
    }
    for (const [key, count] of entries) {
      const row = document.createElement("div");
      row.className = "distribution-row";
      const name = document.createElement("span");
      name.textContent = lookup[key] || key;
      const total = document.createElement("strong");
      total.textContent = String(count);
      row.append(name, total);
      card.append(row);
    }
    distributions.append(card);
  }
  section.append(distributions);
  const note = document.createElement("p");
  note.className = "kpi-footnote";
  note.textContent = "MTTR y SLA se calculan por cohorte de fecha de creación. Los objetivos son la política inicial del prototipo y requieren validación del cliente.";
  section.append(note);
  heading.after(section);
}

async function loadCatalogs() {
  try {
    state.catalogs = await api("/api/catalogos");
    state.catalogError = "";
  } catch {
    state.catalogError =
      "No se pudo conectar con la API local. Inicia el backend para cargar los catálogos.";
  }
}

async function loadSession() {
  try {
    state.user = await api("/api/auth/me");
  } catch {
    state.user = null;
  }
}

async function loadIncidents() {
  if (!state.user) return;
  state.loading = true;
  state.error = "";
  renderManagement();
  const params = new URLSearchParams({ page: String(state.page), limit: String(state.limit) });
  for (const [key, value] of Object.entries(state.filters))
    if (value) params.set(key, value);
  try {
    const result = await api(`/api/incidencias?${params.toString()}`);
    state.incidents = result.data;
    state.total = result.total;
  } catch (error) {
    state.incidents = [];
    state.total = 0;
    state.error = error.message;
  } finally {
    state.loading = false;
    renderManagement();
  }
}

async function loadKpis() {
  if (!state.user) return;
  state.kpiError = "";
  try {
    const params = new URLSearchParams();
    if (state.kpiRange?.desde) params.set("desde", state.kpiRange.desde);
    if (state.kpiRange?.hasta) params.set("hasta", state.kpiRange.hasta);
    const suffix = params.size ? `?${params.toString()}` : "";
    state.kpis = await api(`/api/dashboard/kpis${suffix}`);
  } catch (error) {
    state.kpiError = error.message;
  }
  renderManagement();
}

async function openDetail(id) {
  state.error = "";
  try {
    state.detail = await api(`/api/incidencias/${encodeURIComponent(id)}`);
  } catch (error) {
    state.error = error.message;
  }
  renderManagement();
}

function announce(message) {
  const region = document.querySelector("#toast-region");
  if (region) region.textContent = message;
}

async function onSubmit(event) {
  const form = event.target;
  if (form.id === "incident-form") {
    event.preventDefault();
    state.error = "";
    if (!form.reportValidity()) return;
    const unanswered = [...form.querySelectorAll("fieldset.boolean-field")].some(
      (fieldset) => !fieldset.querySelector('input[type="radio"]:checked'),
    );
    if (unanswered) {
      state.error = "Indica Sí o No en las tres preguntas de impacto.";
      renderReport();
      return;
    }
    const values = new FormData(form);
    const payload = {
      rut_operario: String(values.get("rut_operario")).trim().toUpperCase(),
      ubicacion: values.get("ubicacion"),
      tipo_falla: values.get("tipo_falla"),
      impacto_operativo: values.get("impacto_operativo") === "true",
      riesgo_accidente: values.get("riesgo_accidente") === "true",
      afecta_terceros: values.get("afecta_terceros") === "true",
      comentario: String(values.get("comentario") || "").trim() || null,
    };
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner"></span> Enviando…';
    try {
      state.success = await api("/api/incidencias", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      announce(`Incidencia ${state.success.id} creada.`);
    } catch (error) {
      state.error = error.message;
      if (error.details?.some((detail) => detail.field === "rut_operario"))
        state.error = "Revisa el RUT y su dígito verificador.";
    }
    renderReport();
  } else if (form.id === "login-form") {
    event.preventDefault();
    state.error = "";
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Validando…";
    try {
      state.user = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(values.get("email")).trim(),
          password: values.get("password"),
        }),
      });
      state.page = 1;
      location.hash = "#/manage";
      await loadIncidents();
      await loadKpis();
    } catch (error) {
      state.error = error.message;
      renderLogin();
    }
  } else if (form.id === "filters-form") {
    event.preventDefault();
    const values = new FormData(form);
    state.filters = Object.fromEntries(
      ["q", "estado", "prioridad", "ubicacion"].map((key) => [
        key,
        String(values.get(key) || "").trim(),
      ]),
    );
    state.page = 1;
    await loadIncidents();
  } else if (form.id === "kpi-range-form") {
    event.preventDefault();
    const values = new FormData(form);
    state.kpiRange = {
      desde: String(values.get("desde") || ""),
      hasta: String(values.get("hasta") || ""),
    };
    if (!state.kpiRange.desde && !state.kpiRange.hasta) state.kpiRange = null;
    await loadKpis();
  }
}

async function onClick(event) {
  if (event.target.matches(".modal-backdrop")) {
    state.detail = null;
    state.error = "";
    renderManagement();
    return;
  }
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.open) await openDetail(button.dataset.open);
  if (button.dataset.page) {
    state.page = Number(button.dataset.page);
    await loadIncidents();
  }
  if (button.dataset.transition && state.detail) {
    button.disabled = true;
    state.error = "";
    try {
      await api(`/api/incidencias/${encodeURIComponent(state.detail.id)}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: button.dataset.transition }),
      });
      state.detail = await api(`/api/incidencias/${encodeURIComponent(state.detail.id)}`);
      await loadIncidents();
      await loadKpis();
      announce(`Estado actualizado a ${labels.estado[state.detail.estado]}.`);
    } catch (error) {
      state.error = error.message;
      renderManagement();
    }
  }
  if (button.dataset.action === "logout") {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      state.user = null;
      state.detail = null;
      state.error = "";
      renderLogin();
    }
  }
  if (button.dataset.action === "refresh") {
    await loadIncidents();
    await loadKpis();
  }
  if (button.dataset.action === "clear-filters") {
    state.filters = {};
    state.page = 1;
    await loadIncidents();
    await loadKpis();
  }
  if (button.dataset.action === "new-report") {
    state.success = null;
    state.error = "";
    renderReport();
  }
  if (button.dataset.action === "close-detail") {
    const panel = event.target.closest("[data-detail-panel]");
    if (event.target === button || !panel) {
      state.detail = null;
      state.error = "";
      renderManagement();
    }
  }
}

function renderRoute() {
  state.error = "";
  if (location.hash === "#/manage") {
    if (!state.user) renderLogin();
    else {
      renderManagement();
      loadIncidents();
      loadKpis();
    }
  } else {
    state.success = null;
    renderReport();
  }
}

app.addEventListener("submit", onSubmit);
app.addEventListener("click", onClick);
window.addEventListener("hashchange", renderRoute);

registerSW({ immediate: true });

async function start() {
  if (!location.hash) location.hash = "#/report";
  await Promise.all([loadCatalogs(), loadSession()]);
  renderRoute();
}

start();
