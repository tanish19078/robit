# PRAHARI — Complaint-Anchored Cash-Withdrawal Forecasting

SIH 2026 · PS 26184 · Working prototype.

A cybercrime complaint starts a clock. The system traces the live money path and
returns **where** (ranked H3 cells), **when** (q10/median/q90 minutes),
**who** (mule-ranked nodes) and the **evidence** — for human-reviewed,
simulated intervention.

Documentation: `docs/PRAHARI_Final.md` (product spec) · `docs/architecture.md`
(system design) · `docs/RESULTS.md` (measured numbers) · `docs/DECISIONS.md`
(design log) · `docs/DATA_STRATEGY.md` (data path).

## Quick Start

```bash
# One-time setup
cd ml-service && pip install -r requirements.txt
cd ../frontend && npm install
cd ../gateway  && npm install

# Run everything (auto-builds frontend if needed)
cd ..
python hold_demo.py
# Open http://localhost:3000/
```

The landing page loads with system overview and a "Load Demo Data" button.
Click through to the Incident Queue, select any complaint, and the full
investigation page renders with graph, map, verdict, and review controls.

For development with hot-reload:
```bash
cd frontend && npm run dev    # Vite dev server :5173, proxies API to :3000
```

Deploy: `docs/DEPLOY.md` (Docker Compose / bare processes / PaaS).

## How It Works (4 Modules)

1. **Intake** (`gateway/`): Complaint + transfer/withdrawal/attribute events.
   Validates timestamps (rejects pre-t0 events with 400), deduplicates,
   persists to JSON file store, broadcasts via SSE.

2. **Graph** (`ml-service/graph/`): k-hop BFS subgraph (depth=3) around the
   complaint root. Greedy max-amount path from victim to frontier. Stdlib only.

3. **Mule Detection** (`ml-service/mule/`): 6 explainable features
   (fan_out_vel, fan_in_vel, is_new, hop_depth, split_ratio, terminal_conv)
   plus IsolationForest peer rank. Victims excluded by construction.
   `final = sigmoid(3*baseline + 2*learned - 1.5)`.

4. **Cash-Out Forecast** (`ml-service/forecast/`): Hawkes-lite burst-weighted
   excitation S over H3 cells. Tiers on S: Green <1.2, Amber 1.2-2.0,
   Red >2.0, Critical = live withdrawal. Fusion cap: Red without a suspicious
   peer (max mule final <0.5) steps down to Amber. Quantile window:
   q10/median/q90 minutes until expected cash-out.

**Federation** (`ml-service/federated/`): 3 simulated bank clients share class
means only. FedAvg head matches centralized weights (cosine 1.0,
leakage-tested). Head-only scope; encoder federation is roadmap.

## Frontend (5 Pages)

| Page | Route | Purpose |
|---|---|---|
| Landing | `/` | System overview, pipeline visual, demo data loader |
| Incident Queue | `/incidents` | Complaint table with tier filters, auto-refresh |
| Investigation | `/incidents/:id` | Verdict, rule trace, money graph, map, suspects, review |
| Federation Demo | `/federation` | 3-bank FedAvg results and privacy guarantees |
| Architecture | `/architecture` | Tech stack, module formulas, roadmap comparison |

Built with React 19, Vite, react-router-dom, and react-leaflet. Light green
minimalist theme. No glassmorphism, no build-time CSS framework.

## Repository Structure

```
gateway/              Express :3000 — API, tiers, audit, file store
ml-service/           FastAPI :8000 — graph/ mule/ forecast/ federated/
frontend/             React + Vite — 5 pages, 12 components
  src/pages/          Landing, IncidentQueue, IncidentDetail, FederationDemo, Architecture
  src/components/     Navbar, MoneyGraph, CashoutMap, MuleTable, WhyVerdict, etc.
stream-simulator/     replay_all.py, e2e_check.py, check_osm.py
data/                 config.json, 9+ scenario fixtures, terminals (test + OSM Delhi)
infra/                docker-compose.yml
docs/                 Product spec, results, decisions, deploy guide, data strategy
hold_demo.py          One-command local launcher (builds frontend if needed)
```

## API Endpoints

```
POST /api/incidents                          Register complaint
POST /api/events/transactions                Ingest transfer
POST /api/events/withdrawals                 Ingest withdrawal
POST /api/events/attributes                  Ingest shared attribute
GET  /api/incidents                          List all incidents
GET  /api/incidents/:id/forecast             Run/get forecast
GET  /api/incidents/:id/graph                Get money graph
GET  /api/incidents/:id/alerts               Get alerts
POST /api/alerts/:id/acknowledge             Analyst acknowledge
POST /api/alerts/:id/escalate                Analyst escalate
POST /api/alerts/:id/dismiss                 Analyst dismiss
POST /api/actions/simulate                   Simulate bank action
POST /api/demo/seed                          Load all fixtures
GET  /api/terminals                          Terminal registry
GET  /api/federated/demo                     Federation results
GET  /api/metrics                            Pipeline metrics
GET  /api/stream/:id                         SSE live feed
```

## Tests

```bash
cd ml-service && python test_smoke.py && python federated/test_fed.py
cd ../stream-simulator && python e2e_check.py && python check_osm.py
```

9 fixtures: 4 fraud, 4 negative, 1 fusion-capped. Excitation separates fraud
bursts (S=6.3-11.8) from negatives (S=0.1-1.0). True cell ranked first.
Quantiles ordered. `replay_all.py` confusion matrix: TP=4, FP=0, TN=5, FN=0
(precision 1.00, recall 1.00). Full numbers in `docs/RESULTS.md`.

## Safeguards

- Hashed identifiers throughout — no PII in the pipeline
- Every output tagged `SIMULATION` — no live banking rail
- Mandatory human approval — no autonomous freeze or lien
- Financial actions are simulated and audited only
- Per-alert model version, evidence payload, and immutable audit trail
- Federated learning shares aggregated statistics only
