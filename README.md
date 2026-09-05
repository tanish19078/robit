# PRAHARI — complaint-anchored cash-withdrawal forecasting

SIH 2026 · PS 26184 · working prototype (`robit/`). A cyber-fraud complaint starts
a clock; the system traces the live money path and returns **where** (ranked H3
cells), **when** (q10/median/q90 minutes), **who** (mule-ranked nodes) and the
**evidence** — for human-reviewed, simulated intervention.

Spec: `docs/architecture.md` · product context: `docs/PRAHARI_Final.md` ·
agent rules: `docs/claude.md` · measured numbers: `docs/RESULTS.md`.

## Run it

```powershell
cd ml-service; pip install -r requirements.txt      # once
cd ../gateway; npm install                           # once
cd ..
python hold_demo.py        # boots ml:8000 + gateway:3000, replays demo, stays up
# open http://localhost:3000/ → Forecast
```

Demo flow: complaint `10:00` → Layer-1 `10:01` → split `10:03` → forecast
**Red, top cell p=0.69, window 4/8/13** → analyst ack/escalate → simulated
`step_up` + audit row. Batch all 9 reports:
`python stream-simulator/replay_all.py --gateway http://localhost:3000`
→ verdict table with precision/recall (currently 1.00/1.00, FP 0.00).

## How it works (4 modules)

1. **Intake** (`gateway/`): complaint + transfer/withdrawal JSON → validation
   (pre-`t0` events rejected 400) → JSON file store → SSE live feed.
2. **Graph** (`ml-service/graph/`): k-hop subgraph around the complaint, greedy
   victim→frontier path. Stdlib only.
3. **Mules** (`ml-service/mule/`): explainable baseline (velocity, new-account,
   hop depth, split, terminal convergence) + IsolationForest peer rank.
   Victims are anchors, never suspects. `final = sigmoid(3·base + 2·learned − 1.5)`.
4. **Where+When** (`ml-service/forecast/`): Hawkes-lite cell scores
   (`base + S·proximity·density`, S = burst-weighted excitation) + quantile
   time window. **Tiers run on S** (Green <1.2 · Amber 1.2–2.0 · Red >2.0,
   cuts in `data/config.json`); cells answer *where*. **Fusion cap:** Red
   without a suspicious peer (max mule final <0.5) steps down to Amber.
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
stream-simulator/   replay_all.py (1 or 9 scenarios + verdict table) · e2e_check.py · check_osm.py
data/               config.json (tiers + weights) · terminals.json (test fixture) ·
                    terminals_osm_delhi.json (265 real OSM ATMs, 35 H3 cells) ·
                    9 scenario fixtures (4 fraud, 4 negative, 1 capped) ·
                    fetch_osm_terminals.py
infra/              docker-compose.yml (needs Docker; laptop runs without it)
docs/               PRAHARI_Final.md · RESULTS.md · DATA_STRATEGY.md ·
                    DATA_REQUEST_LETTER.md · DEMO_BRIEF.md
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

9 fixtures (4 fraud, 4 negative, 1 capped): excitation separates fraud
bursts (6.3–11.8; withdrawal 1.1 via live event) from negatives (0.1–1.0);
true cell first; quantiles ordered; e2e tiers exactly
{Red, Critical, Green, Amber}. `replay_all.py` prints the live confusion
table (currently TP=4 FP=0). Full numbers: `docs/RESULTS.md`.

## Safeguards

Hashed IDs, `SIMULATION` tags, mandatory human approval, simulated-only
financial actions, per-alert model version + audit trail. No live NCRP/CBS
integration — see `docs/DATA_STRATEGY.md` for the path to authorized data.
