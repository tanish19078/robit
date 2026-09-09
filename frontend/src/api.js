/** Shared API helpers. All calls go through the same origin (gateway). */

const BASE = "";

export async function get(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

export async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`POST ${path} → ${r.status} ${txt}`);
  }
  return r.json();
}

export function sseConnect(incidentId, onMessage) {
  const es = new EventSource(`${BASE}/api/stream/${incidentId}`);
  es.onmessage = (m) => {
    try { onMessage(JSON.parse(m.data)); } catch { /* skip bad frames */ }
  };
  return es;
}
