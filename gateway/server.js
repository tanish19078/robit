// PRAHARI gateway v0.1 — Express, in-memory store, SSE live feed.
// Run: npm install && node server.js   (needs ml-service on ML_URL, default :8000)
import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));
const PORT = process.env.PORT || 3000;
const ML_URL = process.env.ML_URL || "http://localhost:8000";
const MODEL_VERSION = process.env.MODEL_VERSION || "prahari-0.1-dev";

// ---- in-memory store (Postgres in compose; memory is fine for v0.1 demo) ----
const db = { incidents: {}, events: [], alerts: [], audit: [], seq: 1 };
const sseClients = new Map(); // incident_id -> Set(res)

function pushSSE(incidentId, msg) {
  for (const res of sseClients.get(incidentId) || []) {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  }
}

function bad(res, code, error) { return res.status(code).json({ error }); }

function tierOf(topP, hasLiveWithdrawal) {
  if (hasLiveWithdrawal) return "Critical";
  if (topP > 0.65) return "Red";
  if (topP >= 0.35) return "Amber";
  return "Green";
}

async function ml(path, body) {
  const r = await fetch(`${ML_URL}${path}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`ml ${path} -> ${r.status}`);
  return r.json();
}

// ---- routes ----
app.get("/health", (_req, res) => res.json({ ok: true, model_version: MODEL_VERSION }));

app.post("/api/incidents", (req, res) => {
  const { incident_id, t0, amount, src_hash, channel } = req.body || {};
  if (!incident_id || !t0 || !src_hash) return bad(res, 400, "incident_id, t0, src_hash required");
  if (db.incidents[incident_id]) return bad(res, 409, "incident exists");
  const t0ms = Date.parse(t0);
  if (Number.isNaN(t0ms)) return bad(res, 400, "bad t0");
  db.incidents[incident_id] = {
    incident_id, t0, amount, src_hash, channel,
    victim_lat: req.body.victim_lat ?? 28.6285,
    victim_lon: req.body.victim_lon ?? 77.2137,
  };
  return res.status(201).json({ incident_id });
});

function addEvent(type, req, res) {
  const e = req.body || {};
  const need = ["event_id", "incident_id", "ts", "src"];
  for (const k of need) if (!e[k]) return bad(res, 400, `${k} required`);
  const inc = db.incidents[e.incident_id];
  if (!inc) return bad(res, 404, "unknown incident_id");
  if (Date.parse(e.ts) < Date.parse(inc.t0)) return bad(res, 400, "ts before complaint t0");
  db.events.push({ ...e, type });
  pushSSE(e.incident_id, { kind: "event", event: e });
  return res.status(202).json({ accepted: e.event_id });
}
app.post("/api/events/transactions", (req, res) => addEvent("transfer", req, res));
app.post("/api/events/withdrawals", (req, res) => addEvent("withdrawal", req, res));

const incidentEvents = (id) => db.events.filter((e) => e.incident_id === id);

app.get("/api/incidents/:id/graph", async (req, res) => {
  const inc = db.incidents[req.params.id];
  if (!inc) return bad(res, 404, "unknown incident");
  try {
    return res.json(await ml("/ml/graph", { incident: inc, events: incidentEvents(inc.incident_id) }));
  } catch (err) { return bad(res, 502, String(err.message || err)); }
});

app.get("/api/incidents/:id/forecast", async (req, res) => {
  const inc = db.incidents[req.params.id];
  if (!inc) return bad(res, 404, "unknown incident");
  const events = incidentEvents(inc.incident_id);
  if (!events.length) return bad(res, 400, "no events yet");
  let f;
  try {
    f = await ml("/ml/forecast", { incident: inc, events });
  } catch (err) { return bad(res, 502, String(err.message || err)); }
  const top = f.probable_cashout_cells[0];
  const liveWd = events.some((e) => e.type === "withdrawal");
  const risk_tier = tierOf(top.probability, liveWd);
  const complaint_clock_min = Math.round(
    (Date.parse(events[events.length - 1].ts) - Date.parse(inc.t0)) / 60000);
  const alert = {
    alert_id: `AL-${db.seq++}`, incident_id: inc.incident_id, risk_tier,
    money_path: f.money_path, suspected_nodes: f.suspected_nodes,
    probable_cashout_cells: f.probable_cashout_cells,
    cashout_window_minutes: f.cashout_window_minutes,
    evidence: (f.mule || []).slice(0, 3).flatMap((n) => (n.evidence || []).map((x) => `${n.id}: ${x}`)),
    recommended_action: risk_tier === "Green" ? "continue_monitoring" : "analyst_review_and_simulated_bank_step_up",
    model_version: f.model_version || MODEL_VERSION, human_review_required: true,
    status: "open", ts: new Date().toISOString(), complaint_clock_min,
  };
  db.alerts.push(alert);
  db.audit.push({ audit_id: `AUD-${db.seq}`, incident_id: inc.incident_id, alert_id: alert.alert_id,
    prediction: { tier: risk_tier, top_cell: top.h3_cell, window: alert.cashout_window_minutes },
    decision: null, simulated_action: null, model_version: alert.model_version, ts: alert.ts });
  pushSSE(inc.incident_id, { kind: "forecast", alert });
  return res.json(alert);
});

app.get("/api/incidents/:id/alerts", (req, res) =>
  res.json({ alerts: db.alerts.filter((a) => a.incident_id === req.params.id) }));

for (const action of ["acknowledge", "escalate", "dismiss"]) {
  app.post(`/api/alerts/:id/${action}`, (req, res) => {
    const a = db.alerts.find((x) => x.alert_id === req.params.id);
    if (!a) return bad(res, 404, "unknown alert");
    a.status = action === "dismiss" ? "dismissed" : action === "escalate" ? "escalated" : "acknowledged";
    a.review = { by: req.body?.by || "analyst", reason: req.body?.reason || "", ts: new Date().toISOString() };
    db.audit.push({ audit_id: `AUD-${db.seq}`, incident_id: a.incident_id, alert_id: a.alert_id,
      prediction: null, decision: action, simulated_action: null,
      model_version: a.model_version, ts: a.review.ts });
    return res.json(a);
  });
}

app.post("/api/actions/simulate", (req, res) => {
  const { alert_id, action } = req.body || {};
  const a = db.alerts.find((x) => x.alert_id === alert_id);
  if (!a) return bad(res, 404, "unknown alert");
  if (!["step_up", "hold_request", "patrol_notify"].includes(action)) return bad(res, 400, "bad action");
  const row = { audit_id: `AUD-${db.seq}`, incident_id: a.incident_id, alert_id,
    prediction: null, decision: a.status, simulated_action: `${action} [SIMULATION]`,
    model_version: a.model_version, ts: new Date().toISOString() };
  db.audit.push(row);
  return res.json(row);
});

app.get("/api/metrics", (_req, res) => {
  const byTier = {};
  for (const a of db.alerts) byTier[a.risk_tier] = (byTier[a.risk_tier] || 0) + 1;
  const last = db.alerts[db.alerts.length - 1];
  res.json({ incidents: Object.keys(db.incidents).length, events: db.events.length,
    alerts_by_tier: byTier,
    last_forecast: last ? { tier: last.risk_tier, top_cell: last.probable_cashout_cells[0], window: last.cashout_window_minutes } : null });
});

// SSE live feed (WSS upgrade lands with compose; SSE keeps v0.1 dependency-free)
app.get("/api/stream/:id", (req, res) => {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
  const id = req.params.id;
  if (!sseClients.has(id)) sseClients.set(id, new Set());
  sseClients.get(id).add(res);
  req.on("close", () => sseClients.get(id)?.delete(res));
});

app.listen(PORT, () => console.log(`gateway :${PORT} (ml=${ML_URL})`));
