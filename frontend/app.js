/* Static dashboard: gateway REST + SSE. No build step. */
let map, layer, lastAlert = null, lastMule = {}, sel = null, es = null;
const $ = (id) => document.getElementById(id);
const gw = () => $("gw").value.replace(/\/$/, "");
const inc = () => sel || $("gw").dataset.inc || "INC-2026-00041";

async function jget(p) { const r = await fetch(gw() + p); if (!r.ok) throw new Error(p + " -> " + r.status); return r.json(); }
async function jpost(p, b) {
  const r = await fetch(gw() + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b || {}) });
  if (!r.ok) throw new Error(p + " -> " + r.status + " " + await r.text());
  return r.json();
}
function show(o) { $("raw").textContent = JSON.stringify(o, null, 2); }
function toast(msg) {
  const d = document.createElement("div");
  d.className = "toast"; d.textContent = msg;
  $("toasts").appendChild(d);
  setTimeout(() => d.remove(), 3500);
}
function riskColor(v) { return v > 0.65 ? "#c62828" : v >= 0.35 ? "#ef6c00" : "#2e7d32"; }
function feed(msg) {
  const li = document.createElement("li");
  li.textContent = msg;
  const f = $("feed");
  f.prepend(li);
  while (f.children.length > 8) f.lastChild.remove();
}

/* ---- queue ---- */
async function loadQueue() {
  try {
    const { incidents } = await jget("/api/incidents");
    const q = $("queue");
    q.innerHTML = "";
    if (!incidents.length) q.innerHTML = '<div class="empty">no incidents — run replay_all.py</div>';
    if (!sel && incidents.length) sel = incidents[0].incident_id;
    for (const i of incidents) {
      const d = document.createElement("div");
      d.className = "qitem" + (i.incident_id === inc() ? " sel" : "");
      d.innerHTML = `<span class="dot ${i.last_tier || ""}"></span><span><div class="qid">${i.incident_id}</div><div class="qsub">${i.n_events} events${i.last_tier ? " · " + i.last_tier : ""}</div></span>`;
      d.onclick = () => select(i.incident_id, true);
      q.appendChild(d);
    }
  } catch (e) { toast(String(e)); }
}
function select(id, auto) {
  sel = id;
  document.querySelectorAll(".qitem").forEach((el) => el.classList.toggle("sel", el.textContent.includes(id)));
  connectSSE();
  if (auto) doForecast().catch((e) => toast(String(e)));
}

/* ---- map + graph ---- */
function initMap() {
  map = L.map("map").setView([28.6315, 77.2167], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
  layer = L.layerGroup().addTo(map);
}
async function drawTerminals(topCell) {
  layer.clearLayers();
  try {
    const { terminals } = await jget("/api/terminals");
    for (const t of terminals) {
      const hot = topCell && t.h3_r8 === topCell;
      L.circleMarker([t.lat, t.lon], { radius: hot ? 10 : 5, color: hot ? "red" : "blue" })
        .bindPopup(`${t.terminal_id} (${t.type})<br>${t.h3_r8}`).addTo(layer);
    }
  } catch { /* map still works without terminal feed */ }
}
function drawGraph(graph) {
  const svg = $("graphSvg");
  const W = svg.clientWidth || 520, H = 230;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = "";
  if (!graph || !graph.nodes.length) return;
  const byHop = {};
  for (const n of graph.nodes) (byHop[n.hop] = byHop[n.hop] || []).push(n);
  const hops = Object.keys(byHop).map(Number).sort((a, b) => a - b);
  const pos = {};
  hops.forEach((h, ci) => {
    byHop[h].forEach((n, ri, col) => {
      pos[n.id] = { x: 50 + (ci * (W - 100)) / Math.max(1, hops.length - 1), y: 30 + (ri * (H - 60)) / Math.max(1, col.length - 1 || 1) };
    });
  });
  const NS = "http://www.w3.org/2000/svg";
  for (const e of graph.edges || []) {
    if (!pos[e.src] || !pos[e.dst]) continue;
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", pos[e.src].x); l.setAttribute("y1", pos[e.src].y);
    l.setAttribute("x2", pos[e.dst].x); l.setAttribute("y2", pos[e.dst].y);
    l.setAttribute("stroke", e.type === "withdrawal" ? "#c62828" : e.type === "shared_attribute" ? "#757575" : "#1565c0");
    l.setAttribute("stroke-width", "2");
    if (e.type === "shared_attribute") l.setAttribute("stroke-dasharray", "5,4");
    svg.appendChild(l);
  }
  for (const n of graph.nodes) {
    const p = pos[n.id], s = lastMule[n.id] || 0;
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", "16");
    c.setAttribute("fill", riskColor(s)); c.setAttribute("opacity", "0.85");
    svg.appendChild(c);
    const mk = (y, txt, size, fill) => {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", p.x); t.setAttribute("y", y);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", size);
      if (fill) t.setAttribute("fill", fill);
      t.textContent = txt; svg.appendChild(t);
    };
    mk(p.y + 32, n.id.replace("acct_hash_", "a").replace("victim_hash", "victim").slice(0, 12), "10");
    mk(p.y + 4, s.toFixed(2), "10", "#fff");
  }
}

/* ---- forecast ---- */
function renderForecast(a, graph) {
  lastAlert = a;
  lastMule = {};
  for (const n of a.mule || []) lastMule[n.id] = n.final;
  const el = $("tier");
  el.textContent = `${a.risk_tier} — ${a.cashout_window_minutes.q10}/${a.cashout_window_minutes.median}/${a.cashout_window_minutes.q90} min`;
  el.className = a.risk_tier;
  $("tsub").textContent = `complaint clock T+${a.complaint_clock_min}min · pipeline ${a.alert_latency_ms ?? "?"}ms · ${a.model_version}${a.intensity != null ? ` · intensity ${a.intensity}` : ""}`;
  $("cells").innerHTML = (a.probable_cashout_cells || [])
    .map((c) => `<div class="ev">${c.h3_cell} — p=${c.probability} λ=${c.raw} (${c.nearby_cashout_points} terminals)</div>`).join("");
  $("mules").innerHTML = "<table><tr><th>node</th><th>base</th><th>learned</th><th>final</th></tr>" +
    (a.mule || []).map((n) => `<tr><td>${n.id}</td><td>${n.baseline}</td><td>${n.learned}</td><td><b>${n.final}</b></td></tr>`).join("") + "</table>";
  $("evidence").innerHTML = (a.evidence || []).map((e) => `<li>${e}</li>`).join("") || "<li>—</li>";
  if (graph) drawGraph(graph);
  drawTerminals(a.probable_cashout_cells[0]?.h3_cell);
  show(a);
}
async function doForecast() {
  const [a, g] = await Promise.all([
    jget(`/api/incidents/${inc()}/forecast`),
    jget(`/api/incidents/${inc()}/graph`).catch(() => null),
  ]);
  renderForecast(a, g);
  loadQueue();
}
function renderMetrics(m) {
  const tiers = Object.entries(m.alerts_by_tier || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "no alerts";
  const last = m.last_forecast ? `last: ${m.last_forecast.tier} ${m.last_forecast.top_cell.h3_cell} p=${m.last_forecast.top_cell.probability}` : "no forecast yet";
  $("metrics").innerHTML = `<div>incidents <b>${m.incidents}</b> · events <b>${m.events}</b>${m.avg_latency_ms != null ? ` · avg pipeline <b>${m.avg_latency_ms}ms</b>` : ""}</div><div>${tiers}</div><div>${last}</div>`;
  show(m);
}

/* ---- wiring ---- */
$("bRefreshInc").onclick = () => loadQueue().catch((e) => toast(String(e)));
$("bMetrics").onclick = async () => { try { renderMetrics(await jget("/api/metrics")); } catch (e) { toast(String(e)); } };
$("bFed").onclick = async () => {
  try {
    const f = await jget("/api/federated/demo");
    $("metrics").innerHTML = `<div>fed vs centralized cosine <b>${f.cosine_similarity}</b> · raw shared: <b>${f.raw_tables_shared}</b></div><div>${Object.entries(f.clients).map(([k, v]) => `${k}: ${v.n_nodes} nodes`).join(" · ")}</div>`;
    show(f);
  } catch (e) { toast(String(e)); }
};
document.querySelectorAll("[data-rev]").forEach((b) => {
  b.onclick = async () => {
    if (!lastAlert) return toast("run a Forecast first");
    try {
      const r = await jpost(`/api/alerts/${lastAlert.alert_id}/${b.dataset.rev}`, { by: "analyst", reason: "demo review" });
      $("reviewOut").textContent = `${r.alert_id} → ${r.status}`;
      loadQueue();
    } catch (e) { toast(String(e)); }
  };
});
$("bSim").onclick = async () => {
  if (!lastAlert) return toast("run a Forecast first");
  try {
    const r = await jpost("/api/actions/simulate", { alert_id: lastAlert.alert_id, action: $("simAction").value });
    $("reviewOut").textContent = `${r.simulated_action} (${r.audit_id})`;
    toast("simulated + audited");
  } catch (e) { toast(String(e)); }
};
function connectSSE() {
  if (es) es.close();
  try {
    es = new EventSource(gw() + `/api/stream/${inc()}`);
    es.onopen = () => { const l = $("live"); l.textContent = "● live"; l.classList.add("on"); };
    es.onerror = () => { const l = $("live"); l.textContent = "● reconnecting"; l.classList.remove("on"); };
    es.onmessage = async (m) => {
      const d = JSON.parse(m.data);
      if (d.kind === "event") {
        const e = d.event;
        feed(`+ ${e.type} ${e.amount || ""} ${e.src} → ${e.dst || e.terminal_id} @${(e.ts || "").slice(11, 16)}`);
        loadQueue();
      } else if (d.kind === "forecast") {
        renderForecast(d.alert, await jget(`/api/incidents/${inc()}/graph`).catch(() => null));
        feed(`forecast: ${d.alert.risk_tier} ${d.alert.probable_cashout_cells[0]?.h3_cell}`);
        loadQueue();
      }
    };
  } catch { /* buttons still work */ }
}

initMap();
drawTerminals(null);
loadQueue();
connectSSE();
