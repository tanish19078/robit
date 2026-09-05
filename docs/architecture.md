# PRAHARI — Build Spec (read this first, then code)

PS 26184. Prototype only. No live bank/LEA rails — everything external is simulated + logged.
Product context: `docs/PRAHARI_Final.md`. This file is the contract: services, schemas, APIs, tasks.

## 0. What ships in 36h

- [ ] `POST /api/incidents` + event intake → Redis Streams + Postgres
- [ ] k-hop incident graph + mule scores (baseline always works, embeddings if time)
- [ ] Cell ranking over H3 res 8 + q10/med/q90 window
- [ ] Dashboard: incident queue → graph → heatmap → evidence → ack/escalate/dismiss
- [ ] `POST /api/actions/simulate` + audit row for every decision
- [ ] `replay_all.py --scenario demo_golden_hour` drives the 3-min judge demo
- [ ] `/api/metrics` shows latency, p@K, coverage from the same DB (no hardcoded numbers)

Non-goals: Kafka/Flink, graph DB, full HTGT/GAttNHP, HE/SMPC, paid map tokens, gRPC/CAD connectors.

## 1. Services (5 containers, one compose)

```text
frontend (React+Vite+Leaflet) → gateway (Node/Express :3000) → ml-service (FastAPI :8000)
                                    ↓                              ↓
                              postgres:5432                  redis:6379 (streams + hot state)
stream-simulator (script, not a server): POSTs JSON to gateway
```

`infra/docker-compose.yml` (to add): `gateway, ml-service, redis, postgres, frontend`.
Health: gateway `/health`, ml `/ml/health`. Gateway never blocks >500ms waiting for ML —
call ML sync in demo, move to worker only if p95 hurts.

## 2. Data contract (frozen — do not rename fields)

```json
// POST /api/incidents
{"incident_id":"INC-2026-00041","t0":"2026-01-01T10:00:00Z","amount":50000,"src_hash":"victim_hash","channel":"UPI"}
// POST /api/events/transactions | withdrawals
{"event_id":"evt_001","incident_id":"INC-2026-00041","ts":"2026-01-01T10:01:00Z","type":"transfer",
 "src":"acct_hash_17","dst":"acct_hash_31","amount":48000,"channel":"UPI","bank":"BANK_B",
 "device_hash":null,"terminal_id":null}
// withdrawal: {"type":"withdrawal", ..., "terminal_id":"ATM_042"}
```

Rules: `type ∈ transfer|withdrawal|shared_attribute`. All IDs hashed. `ts >= t0` else 400.
Gateway validates with zod/pydantic, then `XADD incident:{id}:events` + `INSERT events`.
Postgres min tables: `incidents, events, terminals, predictions, alerts, decisions, audit_log, metrics, model_versions`.
Redis min keys: `incident:{id}:meta`, `incident:{id}:events` (stream), `incident:{id}:state`.
Terminals seed (`data/terminals.json`): `{terminal_id, type, lat, lon, h3_r8, bank}`.

## 3. Module build order + owners

### M1 — Intake + replay [gateway + stream-simulator] — build FIRST
Owner: backend person. Done when: `replay_all.py` creates incident + 15 events, all visible via
`GET /api/incidents/:id/graph` (even if graph = raw edge list at first).

### M2 — Graph [ml-service/graph/] — k-hop only, never full-graph
- Input: incident window from Redis. Scope: BFS depth 3 from complaint nodes.
- Edge feats: `[log_amount, dt_since_t0_min, channel_onehot, velocity_5m]`.
- Default: 2-layer GraphSAGE/GAT (PyG). Output: `{nodes:[{id, score_hint, hop}], edges:[...], path:[victim…frontier]}`.
- Fallback if PyG breaks: NetworkX + hand feats. Demo must not depend on GPU.

### M3 — Mule score [ml-service/mule/] — baseline + IsolationForest peer rank
```text
baseline = w1*fan_out_vel + w2*fan_in_vel + w3*is_new + w4*hop_depth + w5*split_ratio + w6*terminal_conv
final = sigmoid(3*baseline + 2*learned - 1.5)   # learned = within-incident anomaly rank; roots excluded
```
Return `{baseline, learned, final, evidence[]}` per node. Evidence strings are the demo —
e.g. `"fan-out 3 in 4 min"`, `"first seen 10:03"`. Tune `w*` on `data/` fixtures, document in `ml-service/mule/weights.json`.

### M4 — Where+When [ml-service/forecast/]
```text
S(t)      = Σ amt_norm_i · exp(-β·dt_i) · (1 + transfers within ±5 min)   # burst-weighted excitation
risk(c,t) = base_prior(c) + S(t) · proximity(c) · density(c)
```
- Candidates: H3 res 8 cells (σ, β in `data/config.json`).
- Time: `median = clamp(30 − 2·S, 5, 120)`, q10/q90 scaled; order enforced.
- Tiers on S (cuts in data/config.json: Green <1.2 · Amber 1.2–2.0 · Red >2.0) · live withdrawal = `Critical`.
- Fusion cap (FP brake): Red needs max mule final ≥0.5, else Amber; Amber needs ≥0.35, else Green.

Forecast response = decision object (gateway persists + pushes WSS):
`{incident_id, complaint_clock_min, risk_tier, money_path, probable_cashout_cells[{h3_cell, probability, nearby_cashout_points}], cashout_window_minutes, evidence[], recommended_action, model_version, human_review_required:true}`.

## 4. API checklist (gateway owns, ml mirrors under /ml/*)

```text
POST /api/incidents → 201 {incident_id}
POST /api/events/transactions | /api/events/withdrawals | /api/events/attributes → 202 (type must match route)
GET  /api/incidents/:id/graph        → M2 output
GET  /api/incidents/:id/forecast     → M4 decision object
GET  /api/incidents/:id/alerts
POST /api/alerts/:id/acknowledge|escalate|dismiss {by, reason}
POST /api/actions/simulate {alert_id, action: step_up|hold_request|patrol_notify} → audit row
GET  /api/metrics → {p50_ms, p95_ms, precision_k_nodes, precision_k_cells, coverage_10_90, fp_rate}
```

Every mutating route writes `audit_log`. `model_version` = git sha or `prahari-0.1-dev`.

## 5. Frontend tasks (keep it ugly but working)

Pages: `/` incident queue (clock ticking since t0) → `/:id` graph + heatmap + evidence + tier buttons → `/metrics`.
Map: Leaflet only, H3 polygon + terminal dots + path polyline. No Deck.gl, no token.
WSS: `incident:{id}` topic → prepend event, bump risk without refresh.
Buttons must call ack/escalate/dismiss + simulate, then show audit id. If WSS breaks, poll `/forecast` every 3s — demo continues.

## 6. Simulator + fixtures (judge demo lives here)

`stream-simulator/replay_all.py --scenario demo_golden_hour --speed 20`:
`10:00` complaint → `10:01` L1 → `10:03` L2 split → `10:06` new node near 4-terminal cluster.
All output tagged `SIMULATION`. Keep `data/demo_golden_hour.json` as the frozen ground truth
(true path, true cell, true cash-out ts) so `/api/metrics` can score the run live.
Also ship `data/normal_day.json` (negatives) to prove we don't Red-flag everything.

## 7. Test + merge rules

- Time-order test: features at `t` must not see events `>t` (unit test with shuffled fixture — must fail if leaked).
- Quantile test: assert `q10 ≤ median ≤ q90` on 3 fixtures.
- Schema test: gateway rejects bad event with 400 + error field (test it, judges will send junk).
- No PR merges a new infra service. New dep? Must run on laptop CPU + free tier.
- Numbers on slides come from `/api/metrics` output pasted into `docs/RESULTS.md` — no invented accuracy.

## 8. Cut list (do not rebuild)

Redis Streams NOT Kafka · in-memory subgraph NOT Memgraph · GraphSAGE/GAT NOT HTGT ·
Hawkes-decay+XGB NOT full GAttNHP · tiny FedAvg stub NOT Flower/HE/SMPC · Leaflet NOT Deck.gl/Mapbox.
If stuck >1h on embeddings/Hawkes, ship baseline + decay formula and move to dashboard + replay — judges score the loop, not the paper.
