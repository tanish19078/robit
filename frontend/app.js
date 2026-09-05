/* Static dashboard: gateway REST + SSE. No build step. */
let map, layer, lastAlert = null, lastMule = {}, sel = null, es = null;
const $ = (id) => document.getElementById(id);
const gw = () => $("gw").value.replace(/\/$/, "");

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
function inr(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function hhmm(ts) { return (ts || "").slice(11, 16); }
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
    if (!sel && incidents.length) { sel = incidents[0].incident_id; connectSSE(); }
    for (const i of incidents) {
      const d = document.createElement("div");
      d.className = "qitem" + (i.incident_id === sel ? " sel" : "");
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

/* ---- map + money graph ---- */
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
  const txt = (x, y, s, size, fill) => {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", size);
    if (fill) t.setAttribute("fill", fill);
    t.textContent = s; svg.appendChild(t);
  };
  for (const e of graph.edges || []) {
    if (!pos[e.src] || !pos[e.dst]) continue;
    const a = pos[e.src], b = pos[e.dst];
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", a.x); l.setAttribute("y1", a.y);
    l.setAttribute("x2", b.x); l.setAttribute("y2", b.y);
    l.setAttribute("stroke", e.type === "withdrawal" ? "#c62828" : e.type === "shared_attribute" ? "#757575" : "#1565c0");
    l.setAttribute("stroke-width", "2");
    if (e.type === "shared_attribute") l.setAttribute("stroke-dasharray", "5,4");
    svg.appendChild(l);
    if (e.type !== "shared_attribute")
      txt((a.x + b.x) / 2, (a.y + b.y) / 2 - 6, `${inr(e.amount)} · ${hhmm(e.ts)}`, "9", "#374151");
  }
  for (const n of graph.nodes) {
    const p = pos[n.id], s = lastMule[n.id] || 0;
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", "16");
    c.setAttribute("fill", riskColor(s)); c.setAttribute("opacity", "0.85");
    svg.appendChild(c);
    txt(p.x, p.y + 32, n.id.replace("acct_hash_", "a").replace("victim_hash", "victim").slice(0, 12), "10");
    txt(p.x, p.y + 4, s.toFixed(2), "10", "#fff");
  }
}

/* ---- explanation: story, why, timeline ---- */
function renderStory(a, graph) {
  const edges = (graph?.edges || []).filter((e) => e.type === "transfer");
  if (!edges.length) { $("story").textContent = ""; return; }
  const first = edges.reduce((m, e) => (e.ts < m.ts ? e : m), edges[0]);
  const dsts = new Set(edges.map((e) => e.dst));
  const span = Math.round((Date.parse(edges.reduce((m, e) => (e.ts > m ? e.ts : m), edges[0].ts)) - Date.parse(first.ts)) / 60000);
  const top = a.probable_cashout_cells[0];
  $("story").textContent =
    `${inr(first.amount)} left the victim account at ${hhmm(first.ts)}, ` +
    `split across ${dsts.size} accounts within ${span} minute${span === 1 ? "" : "s"}. ` +
    `The trail points at a ${top?.nearby_cashout_points}-terminal cluster — ` +
    `expected cash-out around ${a.cashout_window_minutes.median} min after the burst.`;
}
function renderWhy(a) {
  const t = a.tier_detail || {};
  const mark = (ok) => ok ? `<span class="ok">✓</span>` : `<span class="no">✗</span>`;
  const rows = [];
  rows.push(`<li>${mark((t.intensity ?? 0) > (t.red_cut ?? 2))} burst excitation <b>${t.intensity ?? "?"}</b> vs Red cut ${t.red_cut ?? "?"} / Amber ${t.amber_cut ?? "?"}</li>`);
  if (a.risk_tier === "Critical") {
    rows.push(`<li><span class="warn">!</span> live withdrawal on record — tier forced to Critical</li>`);
  } else {
    rows.push(`<li>${mark((t.max_mule_final ?? 0) >= 0.5)} top peer suspicion <b>${t.max_mule_final ?? "?"}</b> (0.5 needed to hold Red)</li>`);
  }
  if (t.capped_from) rows.push(`<li><span class="warn">!</span> stepped down from ${t.capped_from} — hot burst, cool peer (false-positive brake)</li>`);
  const sent = { Green: "Keep watching — nothing here clears the bar.", Amber: "Worth an analyst's eyes, not a bank alert.", Red: `Act now: intervene at cell ${a.probable_cashout_cells[0]?.h3_cell}.`, Critical: "Money is moving out — escalate immediately." }[a.risk_tier];
  rows.push(`<li>→ <b>${sent}</b></li>`);
  $("whyList").innerHTML = rows.join("");
  const bar = $("scaleBar");
  const xmax = Math.max(t.intensity || 0, t.red_cut || 2) * 1.15 || 1;
  const pct = (v) => Math.min(100, (v / xmax) * 100);
  bar.style.display = "block";
  bar.innerHTML =
    `<div class="cut" style="left:${pct(t.amber_cut)}%"><span>amber ${t.amber_cut}</span></div>` +
    `<div class="cut" style="left:${pct(t.red_cut)}%"><span>red ${t.red_cut}</span></div>` +
    `<div class="needle" style="left:${pct(t.intensity)}%" title="S=${t.intensity}"></div>`;
}
function renderTimeline(a) {
  const svg = $("timelineSvg");
  const W = svg.clientWidth || 520, H = 170;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = "";
  const parts = a.excitation_breakdown || [];
  if (!parts.length) return;
  const t = a.tier_detail || {};
  const NS = "http://www.w3.org/2000/svg";
  const base = Date.parse(parts.reduce((m, p) => (p.ts < m ? p.ts : m), parts[0].ts));
  const tmax = Math.max(...parts.map((p) => (Date.parse(p.ts) - base) / 60000), 1);
  const ymax = Math.max(t.red_cut || 2, ...parts.map((p) => p.contribution)) * 1.2;
  const X = (ts) => 40 + ((Date.parse(ts) - base) / 60000 / tmax) * (W - 60);
  const Y = (v) => H - 24 - (v / ymax) * (H - 50);
  const line = (x1, y1, x2, y2, color, dash, w) => {
    const e = document.createElementNS(NS, "line");
    e.setAttribute("x1", x1); e.setAttribute("y1", y1);
    e.setAttribute("x2", x2); e.setAttribute("y2", y2);
    e.setAttribute("stroke", color); e.setAttribute("stroke-width", w || "1");
    if (dash) e.setAttribute("stroke-dasharray", "4,3");
    svg.appendChild(e);
  };
  line(40, Y(t.amber_cut || 0), W - 20, Y(t.amber_cut || 0), "#ef6c00", true);
  line(40, Y(t.red_cut || 0), W - 20, Y(t.red_cut || 0), "#c62828", true);
  for (const p of parts) {
    const x = X(p.ts), bw = Math.max(14, (W - 60) / Math.max(1, parts.length) / 3);
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", x - bw / 2); r.setAttribute("y", Y(p.contribution));
    r.setAttribute("width", bw); r.setAttribute("height", H - 24 - Y(p.contribution));
    r.setAttribute("fill", "#2b6cb0"); r.setAttribute("opacity", "0.8");
    const ti = document.createElementNS(NS, "title");
    ti.textContent = `${p.event_id}: ${inr(p.amount)}, +${p.contribution} (${p.burst_peers} burst peers)`;
    r.appendChild(ti);
    svg.appendChild(r);
    const lb = document.createElementNS(NS, "text");
    lb.setAttribute("x", x); lb.setAttribute("y", H - 8);
    lb.setAttribute("text-anchor", "middle"); lb.setAttribute("font-size", "9"); lb.setAttribute("fill", "#67707c");
    lb.textContent = hhmm(p.ts);
    svg.appendChild(lb);
  }
  const cap = document.createElementNS(NS, "text");
  cap.setAttribute("x", 40); cap.setAttribute("y", 12);
  cap.setAttribute("font-size", "10"); cap.setAttribute("fill", "#67707c");
  cap.textContent = `each bar = one transfer's share of S=${t.intensity} (hover for detail)`;
  svg.appendChild(cap);
}

/* ---- forecast ---- */
function renderForecast(a, graph) {
  lastAlert = a;
  lastMule = {};
  for (const n of a.mule || []) lastMule[n.id] = n.final;
  const el = $("tier");
  el.textContent = `${a.risk_tier} — ${a.cashout_window_minutes.q10}/${a.cashout_window_minutes.median}/${a.cashout_window_minutes.q90} min`;
  el.className = a.risk_tier;
  $("tsub").textContent = `complaint clock T+${a.complaint_clock_min}min · pipeline ${a.alert_latency_ms ?? "?"}ms · ${a.model_version}${a.intensity != null ? ` · S=${a.intensity}` : ""}`;
  renderStory(a, graph);
  renderWhy(a);
  renderTimeline(a);
  const cells = a.probable_cashout_cells || [];
  const pmax = Math.max(...cells.map((c) => c.probability), 0.01);
  $("cells").innerHTML = cells.map((c, i) =>
    `<div class="ev">${c.h3_cell} — p=${c.probability} (${c.nearby_cashout_points} terminals)</div>` +
    `<div class="cbar${i === 0 ? " hot" : ""}"><i style="width:${(c.probability / pmax) * 100}%"></i></div>`).join("");
  $("mules").innerHTML = "<table><tr><th>node</th><th>base</th><th>learned</th><th>final</th></tr>" +
    (a.mule || []).map((n) => `<tr><td>${n.id}</td><td>${n.baseline}</td><td>${n.learned}</td><td><b>${n.final}</b></td></tr>`).join("") + "</table>";
  $("evidence").innerHTML = (a.evidence || []).map((e) => `<li>${e}</li>`).join("") || "<li>—</li>";
  if (graph) drawGraph(graph);
  drawTerminals(cells[0]?.h3_cell);
  show(a);
}
async function doForecast() {
  const [a, g] = await Promise.all([
    jget(`/api/incidents/${sel}/forecast`),
    jget(`/api/incidents/${sel}/graph`).catch(() => null),
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
    es = new EventSource(gw() + `/api/stream/${sel}`);
    es.onopen = () => { const l = $("live"); l.textContent = "● live"; l.classList.add("on"); };
    es.onerror = () => { const l = $("live"); l.textContent = "● reconnecting"; l.classList.remove("on"); };
    es.onmessage = async (m) => {
      const d = JSON.parse(m.data);
      if (d.kind === "event") {
        const e = d.event;
        feed(`+ ${e.type} ${e.amount || ""} ${e.src} → ${e.dst || e.terminal_id} @${(e.ts || "").slice(11, 16)}`);
        loadQueue();
      } else if (d.kind === "forecast") {
        renderForecast(d.alert, await jget(`/api/incidents/${sel}/graph`).catch(() => null));
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
