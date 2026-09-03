# PRAHARI — SIH 2026 PS 26184 (prototype in `robit/`)

Complaint in → money path + ranked H3 cash-out cells + time window + evidence → human-reviewed simulated action.
Spec: `architecture.md` (build this) · context: `docs/PRAHARI_Final.md` · agent rules: `claude.md`.

## Run it (5 min)

```bash
docker compose -f infra/docker-compose.yml up --build   # gateway :3000, ml :8000, redis, postgres, frontend
python stream-simulator/replay.py --scenario demo_golden_hour --speed 20x
# open frontend → INC-2026-00041 → watch cell risk jump ~10:06 → ack/escalate → check audit id
curl localhost:3000/api/metrics
```

Judge flow: `10:00` complaint → `10:01` L1 → `10:03` L2 split → `10:06` new node near
4-terminal H3 cluster → Red + `15/27/45 min` window → simulated step-up → blocked/missed logged.

## Where things live

```text
gateway/            Express :3000 — intake, validation, tiers, WSS, audit
ml-service/graph/   k-hop subgraph + path (GraphSAGE/GAT, NetworkX fallback)
ml-service/mule/    baseline + learned scores + evidence, weights in weights.json
ml-service/forecast/ Hawkes-lite + XGB + quantiles → decision object
frontend/           queue → graph + Leaflet heatmap → evidence → review buttons → metrics
stream-simulator/   replay.py + scenarios (all SIMULATION)
data/               terminals.json, demo_golden_hour.json (ground truth), normal_day.json
infra/              docker-compose.yml (add per architecture.md §1)
docs/               PRAHARI_Final.md + RESULTS.md (paste real /api/metrics here)
```

API: `POST /api/incidents` · `POST /api/events/transactions|withdrawals` ·
`GET /api/incidents/:id/graph|forecast|alerts` ·
`POST /api/alerts/:id/acknowledge|escalate|dismiss` · `POST /api/actions/simulate` · `GET /api/metrics`.

## Rules that keep us out of trouble

Prototype only: hashed IDs, `SIMULATION` tags, human approval required, no live freezes —
`simulate` + audit row only. Time-ordered features, Postgres-only, Leaflet-only,
measured numbers only. Stuck >1h on a model? Ship the `architecture.md` §8 fallback and keep the demo moving.
