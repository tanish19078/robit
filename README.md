# PRAHARI

### Complaint-Anchored Predictive Analytics Framework for Cybercrime Cash-Withdrawal Forecasting
**Smart India Hackathon 2026** · **Problem Statement ID: 26184**

---

## Executive Summary

Current cyber-fraud response mechanisms suffer from a structural **"Golden Hour" deficit**: victims report unauthorized transactions within minutes, but by the time law enforcement issues freezing requests to recipient banks, illicit funds have already hopped through 3–5 layers of mule accounts and exited as physical paper cash through automated teller machines (ATMs) or micro-ATMs. Once withdrawn, recovery rates drop below 3%.

**PRAHARI** shifts the operational posture from **post-mortem forensic investigation** to **pre-withdrawal spatial-temporal interception**. The framework anchors directly to cybercrime complaint intake ($t_0$), builds an immediate $k$-hop temporal transaction subgraph, detects intermediary mule structures, and computes a burst-weighted excitation process that forecasts:
1. **WHERE** the cash-out will be attempted (ranked Uber H3 hexagonal cells with physical terminal density).
2. **WHEN** cash-out is expected ($q_{10}/\text{median}/q_{90}$ probability window in minutes).
3. **WHO** is acting as the mule network (ranked by velocity, topology, and anomaly scores).
4. **WHY** the intervention tier is justified (explainable rule trace + excitation breakdown).

---

## Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. One-Time Setup
```bash
# Install ML microservice dependencies
cd ml-service && pip install -r requirements.txt

# Install frontend & gateway dependencies
cd ../frontend && npm install
cd ../gateway  && npm install
cd ..
```

### 2. Launch Local Prototype
```bash
# Boots ML engine (:8000), Gateway (:3000), and auto-builds React frontend if needed
python hold_demo.py
```
Open **`http://localhost:3000/`** in any modern web browser.

- Press **"Load Demo Data"** on the landing page to populate all 12 scenario incidents.
- Navigate to **"Complaint Queue"** (`/incidents`) and select any complaint to open the live investigation console.

### Development Mode (Hot Reload)
To develop with instant Vite hot-module replacement:
```bash
cd frontend && npm run dev    # Vite dev server on :5173, proxies /api to :3000
```

---

## Core Pipeline (4 Modules, One Loop)

```
[Complaint Intake t₀]
        │
        ▼
Module 1: Causal Ingestion (Gateway :3000)
  ├── Strict causality guard: rejects events with ts < t₀ (HTTP 400)
  ├── O(1) in-memory event indexing & deduplication
  └── Server-Sent Events (SSE) real-time streaming
        │
        ▼
Module 2: Temporal Money Subgraph (FastAPI :8000)
  ├── Breadth-first search (BFS) up to k=3 hops around complaint origin
  ├── Edge types: transfers, cash withdrawals, shared device/IP attributes
  └── Greedy maximum-amount cash trail discovery
        │
        ▼
Module 3: Mule Account Scoring
  ├── Hand-crafted velocity baseline (fan-out, fan-in, split ratio, new account)
  ├── Unsupervised Isolation Forest peer anomaly rank (roots strictly excluded)
  └── Calibrated sigmoid fusion: final = σ(3.0·baseline + 2.0·learned − 1.5)
        │
        ▼
Module 4: Spatial-Temporal Forecasting
  ├── Module 4a: Burst-weighted Hawkes excitation S(t) over H3 resolution 8 cells
  ├── Module 4b: Deterministic non-crossing quantile window (q10, median, q90)
  └── Fusion Cap: High risk requires both temporal burst AND mule peer confirmation
```

### Mathematical Foundations

#### 1. Burst-Weighted Temporal Excitation $S(t)$
Rather than evaluating transaction amounts in isolation, PRAHARI measures clustering velocity:
$$S(t) = \sum_{i \in \mathcal{E}} \left( \frac{\text{amount}_i}{\text{ref\_amount}} \right) \cdot \exp\left(-\beta \cdot \Delta t_i\right) \cdot \left(1 + \text{burst\_peers}_i\right)$$
- $\beta = 0.12/\text{min}$: Exponential decay rate.
- $\text{burst\_peers}_i$: Count of companion transfers occurring within $\pm 5$ minutes of event $i$.
- **Result**: A single large vendor transfer (₹2,00,000) yields $S \approx 1.0$ (**Green**); a 4-way structured fan-out (₹50,000 split into ₹12,500 transfers) yields $S \approx 7.74$ (**Red**).

#### 2. Spatial Cell Likelihood
$$\text{risk}(c, t) = \text{base\_prior}(c) + S(t) \cdot \text{proximity}(c) \cdot \text{density}(c)$$
- $\text{proximity}(c)$: Gaussian spatial decay from complaint origin ($\sigma = 1.5\text{ km}$).
- $\text{density}(c)$: Normalized count of ATM, micro-ATM, and POS terminals within cell $c$.

#### 3. Non-Crossing Time Quantiles
$$\text{median} = \text{clamp}\left(30.0 - 2.0 \cdot S - 1.0 \cdot (\text{frontier\_hops} - 1), [5, 120]\right)$$
$$q_{10} = \max\left(2, \text{median} \times 0.55\right), \quad q_{90} = \text{median} \times 1.65$$
Guarantees strict monotonicity: $q_{10} \le \text{median} \le q_{90}$. Higher excitation contracts the countdown window, signaling higher urgency to field units.

---

## Minimalist Multi-Page Frontend

Built with **React 19**, **Vite**, **React Router v7**, and **React-Leaflet**, featuring a light green minimalist palette designed for high contrast and rapid cognitive comprehension during live operations:

| Route | Page | Core Functionality |
|---|---|---|
| **`/`** | **Landing / Home** | Executive summary, live system metrics, 4-step interactive pipeline diagram, Golden Hour problem framing, and single-click demo data seeder. |
| **`/incidents`** | **Complaint Queue** | Sortable intake register with risk tier indicators, amounts, channels, timestamps, real-time tier filter chips, and automated 5-second polling. |
| **`/incidents/:id`** | **Investigation Workspace** | Full incident intelligence console: case file sidebar, large verdict banner, explainable rule trace with threshold needle, SVG money trail, interactive Leaflet ATM cluster map, excitation chart, suspect rankings, analyst review actions (`Acknowledge`, `Escalate`, `Dismiss`), and live SSE event feed. |
| **`/federation`** | **Federation Demo** | Visual demonstration of 3-bank privacy-preserving Federated Averaging (`BANK_A`, `BANK_B`, `BANK_C`), feature weight comparisons, cosine similarity metric ($1.0$), and data leakage verification. |
| **`/architecture`** | **System Architecture** | Technical breakdown of service topology, pipeline formulas, prototype vs. production roadmap comparison, and compliance safeguards. |

---

## Privacy-Preserving Cross-Bank Federation

Money launderers intentionally distribute transactions across distinct banking institutions to break visibility. PRAHARI implements **Privacy-Preserving Federated Averaging (FedAvg)** over the linear classification head:
- Each participating institution (`BANK_A`, `BANK_B`, `BANK_C`) computes local feature means (`mean_fraud`, `mean_benign`) and node sample counts.
- **Zero Raw Data Sharing**: Individual transactions, account hashes, device IDs, and graph edges **never leave bank premises**.
- The central coordinator aggregates class difference vectors:
  $$w_{\text{fed}} = \sum_{k} \frac{n_k}{N} \left(\mu_{\text{fraud}, k} - \mu_{\text{benign}, k}\right)$$
- **Empirical Result**: Cosine similarity between federated weights and centralized pooled training is **$\ge 0.999$ (effectively $1.0$)**, with automated regression assertions verifying that raw tables were never shared.

---

## Empirical Benchmark & Validation Results

*All figures are measured directly from the test suite — no hypothetical numbers.*

### 1. Regression Suite (`ml-service/test_smoke.py`)
Evaluates 12 distinct scenario fixtures across all risk tiers:

| Scenario Fixture | Type | Excitation $S$ | Max Mule Score | Predicted Tier | Top Cell | Window ($q_{10}/\text{med}/q_{90}$) |
|---|---|---|---|---|---|---|
| `demo_golden_hour.json` | Rapid Split (₹50k) | $7.74$ | $0.909$ | **Red** | `8928308280fffff` | $6 / 12 / 19\text{ min}$ |
| `fraud_multi_path.json` | 3-Layer Hop | $11.78$ | $0.846$ | **Red** | `8928308281fffff` | $3 / 5 / 8\text{ min}$ |
| `fraud_uptown.json` | Commercial Hub | $6.35$ | $0.909$ | **Red** | `8928308282fffff` | $8 / 14 / 24\text{ min}$ |
| `fraud_fanout.json` | 3-Way Layer-1 Split | $17.32$ | $0.928$ | **Red** | `8928308281fffff` | $3 / 5 / 8\text{ min}$ |
| `fraud_withdrawal.json` | Single ATM Cash-out | $1.07$ | $0.366$ | **Critical** | `8928308280fffff` | $14 / 26 / 43\text{ min}$ |
| `dual_withdrawal.json` | Concurrent ATM Out | $2.18$ | $0.839$ | **Critical** | `8928308280fffff` | $13 / 24 / 39\text{ min}$ |
| `normal_day.json` | Regular Peer Transfers | $0.16$ | $0.366$ | **Green** | `8928308280fffff` | $15 / 28 / 46\text{ min}$ |
| `salary_rent.json` | Salary + Rent Payment | $0.70$ | $0.343$ | **Green** | `8928308280fffff` | $15 / 28 / 46\text{ min}$ |
| `family_remittance.json`| Inter-family Transfer | $0.10$ | $0.343$ | **Green** | `8928308280fffff` | $16 / 29 / 48\text{ min}$ |
| `business_payment.json` | Single Large Vendor (₹2L)| $1.00$ | $0.343$ | **Green** | `8928308280fffff` | $15 / 27 / 45\text{ min}$ |
| `slow_transfer.json` | Low-Velocity Peer | $0.28$ | $0.419$ | **Green** | `8928308280fffff` | $15 / 27 / 45\text{ min}$ |
| `repeat_vendor.json` | Burst to Known Vendor | $3.99$ | $0.413$ | **Amber** *(Capped)* | `8928308280fffff` | $12 / 21 / 35\text{ min}$ |

### 2. End-to-End Batch Confusion Matrix
```powershell
python stream-simulator/replay_all.py --gateway http://localhost:3000
```
- **True Positives (TP)**: 6 (4 Red bursts + 2 Critical withdrawals correctly identified)
- **False Positives (FP)**: 0 (All 5 benign controls stayed Green; repeat vendor capped to Amber)
- **True Negatives (TN)**: 5
- **False Negatives (FN)**: 0
- **Precision**: `1.00` | **Recall**: `1.00` | **False-Positive Rate**: `0.00`

### 3. Key Engineering Findings (Caught & Fixed During Build)
1. **Map-Independent Generalizability**: Initial prototype designs scored cell likelihood on raw spatial density ($\lambda$), which varied drastically across different cities ($0.24$ on 3-cell synthetic grid vs. $0.66$ on 35-cell OpenStreetMap Delhi map). By separating temporal excitation $S$ from spatial decay, the risk metric became completely map-independent (`check_osm.py` verified).
2. **False-Positive Fusion Brake**: High transaction amounts alone must not trigger high-priority alerts. When burst excitation is hot ($S > 2.0$) but no intermediary mule exhibits an anomaly score ($\ge 0.50$), the gateway automatically steps the alert down from **Red** to **Amber** (`repeat_vendor.json`), protecting bank fraud teams from alert fatigue.
3. **Victim Immunity by Construction**: The complaint reporting entity (`victim_hash`) is structurally quarantined from unsupervised anomaly scoring, eliminating the risk of victim accounts being misclassified as mules.

---

## API Specification

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/incidents` | Register complaint anchor ($t_0$, amount, victim hash, coordinates). |
| `POST` | `/api/events/transactions` | Ingest transfer event (validates $ts \ge t_0$, deduplicates). |
| `POST` | `/api/events/withdrawals` | Ingest physical cash-out event (forces Critical tier). |
| `POST` | `/api/events/attributes` | Ingest shared hardware hash, device token, or IP link. |
| `GET` | `/api/incidents` | List all tracked complaints with event tallies and latest tier. |
| `GET` | `/api/incidents/:id/forecast` | Execute pipeline: return ranked H3 cells, time window, and mules. |
| `GET` | `/api/incidents/:id/graph` | Retrieve $k$-hop BFS transaction subgraph and greedy money path. |
| `POST` | `/api/alerts/:id/(acknowledge\|escalate\|dismiss)` | Human-in-the-loop analyst review state transitions. |
| `POST` | `/api/actions/simulate` | Record simulated banking intervention (`step_up`, `hold_request`, `patrol_notify`). |
| `GET` | `/api/stream/:id` | Real-time Server-Sent Events (SSE) feed with automated keepalive. |
| `POST` | `/api/demo/seed` | Atomically seed and evaluate all 12 test fixtures. |
| `GET` | `/api/terminals` | Return physical ATM / POS registry. |
| `GET` | `/api/federated/demo` | Execute 3-bank federated head learning benchmark. |
| `GET` | `/api/metrics` | Retrieve operational stats (incident count, tier breakdown, latency). |

---

## Operational Safeguards & Ethics

1. **Zero PII Exposure**: All account numbers, customer IDs, and device identifiers are cryptographically hashed prior to ingestion.
2. **Explicit Simulation Guardrails**: Every countermeasure and response is flagged `[SIMULATION]`. No autonomous account freezes, lien placements, or live banking API rails are triggered without human oversight.
3. **Human-in-the-Loop Requirement**: System decisions generate decision-support intelligence. Final determinations require explicit analyst review (`Acknowledge`, `Escalate`, or `Dismiss`).
4. **Immutable Audit Trail**: Every forecast, review action, and simulated countermeasure creates an append-only audit record tagged with the exact model version and timestamp.

---

## Running the Automated Test Suite

```powershell
# 1. ML Engine Smoke Regression (12 fixtures)
cd ml-service && python test_smoke.py

# 2. Federated Learning & Privacy-Leakage Verification
python federated/test_fed.py

# 3. Real-World OpenStreetMap ATM Compatibility Check (265 Delhi ATMs)
cd ../stream-simulator && python check_osm.py

# 4. End-to-End Stack Lifecycle & Schema Validation
python e2e_check.py
```
