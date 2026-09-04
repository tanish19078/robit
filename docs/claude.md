# Agent rules — robit/

You are coding in a 36h hackathon repo. Spec: `architecture.md` (contract, wins on conflict).
Context: `docs/PRAHARI_Final.md`. Keep diffs small, runnable on laptop CPU, no new infra.

## Hard bans (prototype)

No Kafka/Flink, Memgraph/Neo4j, PostGIS, full HTGT, full GAttNHP, Flower/HE/SMPC,
Deck.gl, Mapbox tokens, gRPC/CAD connectors. If asked, implement the §8 fallback instead
and note it as roadmap.

## Conventions

- Services: `gateway/` Node+Express :3000 (I/O, validation, tiers, audit, WSS).
  `ml-service/` FastAPI :8000 (`graph/`, `mule/`, `forecast/`). Talk only via `architecture.md` §4 routes.
- Schema frozen (§2): `incident_id, t0, event_id, ts, type, src/dst, amount, channel, bank, device_hash, terminal_id`.
  Validate both sides (zod + pydantic). Reject `ts < t0` with 400.
- Hashes only (`acct_hash_*`). Tag synthetic data + simulated actions `SIMULATION`. No PII in logs/screenshots.
- Time-order: features at `t` see events ≤ `t` only. `eventually_withdrawn` is label-only.
- Every ML return carries `evidence[]`, component scores (`baseline/learned/final`, per-cell `probability`),
  `model_version`, and obeys `q10 ≤ median ≤ q90` (sort in code).
- Tiers on excitation S (cuts in data/config.json: Green <0.2 · Amber 0.2–0.4 · Red >0.4) · Critical = live withdrawal. No auto-freeze —
  irreversible actions only via `POST /api/actions/simulate` + `audit_log` row.
- H3 default res 8, configurable via `config.json` (σ, β, weights live there too, not hardcoded).
- DB: Postgres only; hot state in Redis (`incident:{id}:meta|events|state`). No new stores.

## How to work

1. Pick the earliest unfinished §3 module (M1→M4). Make its API return the contracted shape
   with stub values before adding the model.
2. Add/extend fixtures in `data/` + a unit test (schema reject, time-order, quantile order).
3. Wire gateway → ml → frontend for that module; verify with
   `replay.py --scenario demo_golden_hour` and `GET /api/metrics` before moving on.
4. If blocked >1h on PyG/Hawkes, ship the §8 fallback (NetworkX + decay formula + XGB/LR),
   keep the interface, and unblock the demo path.
5. Paste measured `/api/metrics` into `docs/RESULTS.md`; never invent precision/latency numbers.
