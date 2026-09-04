/* PRAHARI v0.1 dashboard. Static page, Leaflet CDN, talks to gateway REST+SSE. */
let map, layer, lastAlert = null, lastMule = {};
const $ = (id) => document.getElementById(id);
const gw = () => $("gw").value.replace(/\/$/, "");
const inc = () => $("inc").value.trim();

async function jget(p) { const r = await fetch(gw() + p); if (!r.ok) throw new Error(p + " -> " + r.status); return r.json(); }
async function jpost(p, b) {
  const r = await fetch(gw() + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b || {}) });
  if (!r.ok) throw new Error(p + " -> " + r.status + " " + await r.text());
  return r.json();
}
function show(o) { $("raw").textContent = JSON.stringify(o, null, 2); }
function riskColor(v) {
  if (v > 0.65) return "#c62828";
  if (v >= 0.35) return "#ef6c00";
  return "#2e7d32";
}

/* ---- map ---- */
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

/* ---- money graph (SVG, hop columns) ---- */
function drawGraph(graph) {
  const svg = $("graphSvg");
  const W = svg.clientWidth || 520, H = 220;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = "";
  if (!graph || !graph.nodes.length) return;
  const byHop = {};
  for (const n of graph.nodes) (byHop[n.hop] = byHop[n.hop] || []).push(n);
  const hops = Object.keys(byHop).map(Number).sort((a, b) => a - b);
  const pos = {};
  hops.forEach((h, ci) => {
    const col = byHop[h];
    col.forEach((n, ri) => {
      pos[n.id] = { x: 50 + (ci * (W - 100)) / Math.max(1, hops.length - 1), y: 30 + (ri * (H - 60)) / Math.max(1, col.length - 1 || 1) };
    });
  });
  const NS = "http://www.w3.org/2000/svg";
  const line = (a, b, color, dash) => {
    const e = document.createElementNS(NS, "line");
    e.setAttribute("x1", a.x); e.setAttribute("y1", a.y);
    e.setAttribute("x2", b.x); e.setAttribute("y2", b.y);
    e.setAttribute("stroke", color); e.setAttribute("stroke-width", "2");
    if (dash) e.setAttribute("stroke-dasharray", "5,4");
    svg.appendChild(e);
  };
  for (const e of graph.edges || []) {
    if (!pos[e.src] || !pos[e.dst]) continue;
    line(pos[e.src], pos[e.dst], e.type === "withdrawal" ? "#c62828" : e.type === "shared_attribute" ? "#757575" : "#1565c0", e.type === "shared_attribute");
  }
  for (const n of graph.nodes) {
    const p = pos[n.id], score = (lastMule[n.id] != null ? lastMule[n.id] : 0);
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", "16");
    c.setAttribute("fill", riskColor(score)); c.setAttribute("opacity", "0.85");
    svg.appendChild(c);
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", p.x); t.setAttribute("y", p.y + 32);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "10");
    t.textContent = n.id.replace("acct_hash_", "a").replace("victim_hash", "victim").slice(0, 12);
    svg.appendChild(t);
    const s = document.createElementNS(NS, "text");
    s.setAttribute("x", p.x); s.setAttribute("y", p.y + 4);
    s.setAttribute("text-anchor", "middle"); s.setAttribute("font-size", "10"); s.setAttribute("fill", "#fff");
    s.textContent = score.toFixed(2);
    svg.appendChild(s);
  }
}

/* ---- forecast render ---- */
function renderForecast(a, graph) {
  lastAlert = a;
  lastMule = {};
  for (const n of a.mule || []) lastMule[n.id] = n.final;
  const el = $("tier");
  el.textContent = `${a.risk_tier} — ${a.cashout_window_minutes.q10}/${a.cashout_window_minutes.median}/${a.cashout_window_minutes.q90} min`;
  el.className = a.risk_tier;
  $("path").textContent = (a.money_path || []).join(" → ");
  $("mules").innerHTML = "<table><tr><th>node</th><th>base</th><th>learned</th><th>final</th></tr>" +
    (a.mule || []).map((n) => `<tr><td>${n.id}</td><td>${n.baseline}</td><td>${n.learned}</td><td><b>${n.final}</b></td></tr>`).join("") + "</table>";
  $("cells").innerHTML = (a.probable_cashout_cells || [])
    .map((c) => `<div>${c.h3_cell} — p=${c.probability} λ=${c.raw} (${c.nearby_cashout_points} terminals)</div>`).join("");
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
}

async function loadIncidents(auto) {
  try {
    const { incidents } = await jget("/api/incidents");
    const sel = $("incSel");
    sel.innerHTML = "";
    for (const i of incidents) {
      const o = document.createElement("option");
      o.value = i.incident_id;
      o.textContent = `${i.incident_id} (${i.n_events} ev)`;
      sel.appendChild(o);
    }
    if (auto && incidents.length && !$("inc").value) $("inc").value = incidents[0].incident_id;
  } catch { /* gateway may be empty/down */ }
}

function renderMetrics(m) {
  const tiers = Object.entries(m.alerts_by_tier || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "no alerts";
  const last = m.last_forecast ? `last: ${m.last_forecast.tier} ${m.last_forecast.top_cell.h3_cell} p=${m.last_forecast.top_cell.probability}` : "no forecast yet";
  $("metrics").innerHTML = `<div>incidents <b>${m.incidents}</b> · events <b>${m.events}</b></div><div>${tiers}</div><div>${last}</div>`;
  show(m);
}

$("bForecast").onclick = async () => { try { await doForecast(); } catch (e) { show(String(e)); } };
$("bMetrics").onclick = async () => { try { renderMetrics(await jget("/api/metrics")); } catch (e) { show(String(e)); } };
$("bRefreshInc").onclick = async () => { await loadIncidents(false); };
$("incSel").onchange = async (e) => { $("inc").value = e.target.value; try { await doForecast(); } catch (err) { show(String(err)); } };
document.querySelectorAll("[data-rev]").forEach((b) => {
  b.onclick = async () => {
    if (!lastAlert) return $("reviewOut").textContent = "run Forecast first";
    try {
      const r = await jpost(`/api/alerts/${lastAlert.alert_id}/${b.dataset.rev}`, { by: "analyst", reason: "demo review" });
      $("reviewOut").textContent = `${r.alert_id} → ${r.status}`;
    } catch (e) { $("reviewOut").textContent = String(e); }
  };
});
$("bSim").onclick = async () => {
  if (!lastAlert) return $("reviewOut").textContent = "run Forecast first";
  try {
    const r = await jpost("/api/actions/simulate", { alert_id: lastAlert.alert_id, action: $("simAction").value });
    $("reviewOut").textContent = `${r.simulated_action} (${r.audit_id})`;
  } catch (e) { $("reviewOut").textContent = String(e); }
};

try {
  const es = new EventSource(gw() + `/api/stream/${inc()}`);
  es.onmessage = async (m) => {
    const d = JSON.parse(m.data);
    if (d.kind === "forecast") {
      const g = await jget(`/api/incidents/${inc()}/graph`).catch(() => null);
      renderForecast(d.alert, g);
    }
  };
} catch { /* buttons still work */ }

initMap();
drawTerminals(null);
loadIncidents(true);
