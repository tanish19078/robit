/* PRAHARI v0.1 dashboard. Static page, Leaflet CDN, talks to gateway REST+SSE. */
let map, layer, lastAlert = null;
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

function renderForecast(a) {
  lastAlert = a;
  const el = $("tier");
  el.textContent = `${a.risk_tier} — ${a.cashout_window_minutes.q10}/${a.cashout_window_minutes.median}/${a.cashout_window_minutes.q90} min`;
  el.className = a.risk_tier;
  $("path").textContent = (a.money_path || []).join(" → ");
  $("cells").innerHTML = (a.probable_cashout_cells || [])
    .map((c) => `<div>${c.h3_cell} — p=${c.probability} (${c.nearby_cashout_points} terminals)</div>`).join("");
  $("evidence").innerHTML = (a.evidence || []).map((e) => `<li>${e}</li>`).join("") || "<li>—</li>";
  drawTerminals(a.probable_cashout_cells[0]?.h3_cell);
  show(a);
}

$("bGraph").onclick = async () => { try { show(await jget(`/api/incidents/${inc()}/graph`)); } catch (e) { show(String(e)); } };
$("bForecast").onclick = async () => { try { renderForecast(await jget(`/api/incidents/${inc()}/forecast`)); } catch (e) { show(String(e)); } };
$("bMetrics").onclick = async () => { try { show(await jget("/api/metrics")); } catch (e) { show(String(e)); } };
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

// live updates without refresh (falls back silently to buttons if SSE blocked)
try {
  const es = new EventSource(gw() + `/api/stream/${inc()}`);
  es.onmessage = (m) => { const d = JSON.parse(m.data); if (d.kind === "forecast") renderForecast(d.alert); };
} catch { /* buttons still work */ }

initMap();
drawTerminals(null);
