# PRAHARI — complaint-anchored cash-withdrawal forecasting

SIH 2026 · PS 26184 · working prototype (`robit/`). A cyber-fraud complaint starts
a clock; the system traces the live money path and returns **where** (ranked H3
cells), **when** (q10/median/q90 minutes), **who** (mule-ranked nodes) and the
**evidence** — for human-reviewed, simulated intervention.

Spec: `architecture.md` · product context: `docs/PRAHARI_Final.md` ·
agent rules: `claude.md` · measured numbers: `docs/RESULTS.md`.

## Run it

```powershell
cd ml-service; pip install -r requirements.txt      # once
cd ../gateway; npm install                           # once
cd ..
python hold_demo.py        # boots ml:8000 + gateway:3000, replays demo, stays up
# open http://localhost:3000/ → Forecast
```

Demo flow: complaint `10:00` → Layer-1 `10:01` → split `10:03` → forecast
**Red, top cell p=0.67, window 12/22/37** → analyst ack/escalate → simulated
`step_up` + audit row. Other scenarios: `python stream-simulator/replay.py
--scenario fraud_multi_path|fraud_withdrawal|normal_day`.

## How it works (4 modules)

1. **Intake** (`gateway/`): complaint + transfer/withdrawal JSON → validation
   (pre-`t0` events rejected 400) → JSON file store → SSE live feed.
2. **Graph** (`ml-service/graph/`): k-hop subgraph around the complaint, greedy
   victim→frontier path. Stdlib only.
3. **Mules** (`ml-service/mule/`): explainable baseline (velocity, new-account,
   hop depth, split, terminal convergence) + IsolationForest peer rank.
   Victims are anchors, never suspects. `final = sigmoid(3·base + 2·learned − 1.5)`.
4. **Where+When** (`ml-service/forecast/`): Hawkes-lite cell scores
   (`base + S·proximity·density`) + quantile time window. **Tiers run on
   excitation S** (map-independent imminence: Green <0.2 · Amber 0.2–0.4 ·
   Red >0.4, cuts in `data/config.json`); cells answer *where*.
   Live withdrawal event → Critical.

Federation (`ml-service/federated/`): 3 simulated bank clients share class means
only; FedAvg head matches centralized weights (cosine 1.0, leakage-tested).
Head-only demo — encoder federation is roadmap.

## Repo map

```text
gateway/            Express :3000 — API, tiers, audit, file store, serves frontend/
ml-service/         FastAPI :8000 — graph/ mule/ forecast/ federated/ (+ smoke + fed tests)
frontend/           static dashboard — tier badge, SVG money-graph, mule table,
                    Leaflet heatmap, review buttons, metrics, federation panel
stream-simulator/   replay.py (scenarios) · e2e_check.py · check_osm.py
data/               config.json · terminals.json (test fixture) ·
                    terminals_osm_delhi.json (265 real OSM ATMs, 35 H3 cells) ·
                    4 scenario fixtures · fetch_osm_terminals.py
infra/              docker-compose.yml (needs Docker; laptop runs without it)
docs/               PRAHARI_Final.md · RESULTS.md · DATA_STRATEGY.md · DATA_REQUEST_LETTER.md
hold_demo.py        one-command local stack
```

Swap terminal maps without code changes: `ML_TERMINALS` (ml-service) and
`TERMINALS_FILE` (gateway) env paths. Other env: `PORT`, `ML_URL`,
`MODEL_VERSION`, `STORE_FILE`.

## API

`POST /api/incidents` · `POST /api/events/transactions|withdrawals` ·
`GET /api/incidents` · `GET /api/incidents/:id/graph|forecast|alerts` ·
`POST /api/alerts/:id/acknowledge|escalate|dismiss` ·
`POST /api/actions/simulate` · `GET /api/terminals` ·
`GET /api/federated/demo` · `GET /api/metrics` · `GET /api/stream/:id` (SSE).

## Tests (all must pass)

```powershell
cd ml-service; python test_smoke.py; python federated/test_fed.py
cd ../stream-simulator; python e2e_check.py; python check_osm.py
```

4 fixtures (3 fraud shapes + 1 negative): true cell ranked first, fraud
excitation 0.53–2.94 vs negative 0.16, quantiles ordered, fraud nodes top-3,
e2e tiers exactly {Red, Critical, Green}. See `docs/RESULTS.md` for the
transfer finding (why S, not cell share) and all measured values.

## Safeguards

Hashed IDs, `SIMULATION` tags, mandatory human approval, simulated-only
financial actions, per-alert model version + audit trail. No live NCRP/CBS
integration — see `docs/DATA_STRATEGY.md` for the path to authorized data.
