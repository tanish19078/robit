# PRAHARI: Live Demonstration Master Brief

**Predictive Intelligence Engine for Cyber-Fraud Cash-Out Interception**  
*Evaluation Strategy: 3-Minute Live Walkthrough + 2-Minute Technical Q&A*

---

## 1. The 30-Second Opening Hook

> *"Judges, when a cybercrime complaint is filed on 1930 or NCRP, law enforcement is already losing a race against time. Fraudsters route stolen money through 3 to 5 layers of mule accounts within 20 minutes, and once that money exits as physical paper cash from an ATM, the recovery rate drops below 3%.*
>
> *PRAHARI solves the 'Golden Hour' deficit. We don't just classify past fraud; we start a live clock at complaint filing ($t_0$) and forecast **WHERE** cash-out will be attempted, **WHEN** it will happen, **WHO** is moving it, and **WHY** an analyst should act now — before the cash leaves the machine."*

---

## 2. Pre-Demo Checklist (Run Before Judges Approach)

1. **Boot the Integrated Stack**:
   ```bash
   python hold_demo.py
   ```
   *Terminal should confirm:*
   - `ml-service` healthy on port `8000`
   - `gateway` healthy on port `3000`
   - React frontend served directly from `gateway`
   - Demo scenario seeded automatically
2. **Open the Console**: Navigate to `http://localhost:3000/`.
3. **Offline Resilience Note**: If the venue has no internet connection, the Leaflet map tiles will display a neutral canvas, but the SVG graph, H3 coordinates, calculations, and animations operate completely offline without external API dependencies. Mention this upfront — judges reward operational transparency.

---

## 3. The 3-Minute Minute-by-Minute Script

```
0:00 ─── 0:45 │ Scene 1: The Intake & The Golden Hour Problem (Landing & Queue)
0:45 ─── 1:45 │ Scene 2: The Core Prediction (Where, When & Why on INC-2026-00041)
1:45 ─── 2:30 │ Scene 3: The False-Positive Brakes (Negative Controls & Fusion Cap)
2:30 ─── 3:00 │ Scene 4: Privacy-Preserving Federation & Actionable Intervention
```

---

### Minute 1: The Complaint Intake & Money Trail (0:00 – 0:45)

1. **Start on the Landing Page (`/`)**:
   - Point to the red **`[SIMULATION]`** badge: *"Everything shown uses synthetic fixtures with zero live PII, designed to plug into NCRP complaint streams."*
   - Point to the **Golden Hour Deficit** card and the 4-stage pipeline strip.
   - Click **"Enter Command Center →"** to enter the Complaint Queue (`/incidents`).
2. **In the Complaint Queue (`/incidents`)**:
   - Highlight the live incoming queue. Notice the colored risk indicators.
   - Click complaint **`INC-2026-00041`** (₹50,000 UPI fraud) to open the live investigation workspace.

---

### Minute 2: Core Prediction Intelligence (0:45 – 1:45)

1. **Section A — Verdict Banner & Natural Story**:
   - Read the verdict: **`RED — 6 / 12 / 19 min`**.
   - Read the auto-generated natural language story:
     > *"₹50,000 left the victim account at 10:01, split across 2 mule accounts within 2 minutes. The trail points at a 4-terminal cluster — expected cash-out around 12 minutes after the burst."*
   - Point to the latency badge: **Pipeline execution in sub-100 milliseconds**.
2. **Section B — Why This Verdict (Rule Trace)**:
   - Point to the **Excitation Scale Bar**:
     - Burst excitation score: **$S = 7.74$**, well past the Red threshold ($2.0$).
     - Explain: *"Notice how the score needle sits far past the red cut. We don't just output a black-box probability; we show the exact rule trace."*
3. **Section C — The Interactive Money Trail**:
   - Show the **SVG Money Graph**:
     - Victim node $\to$ Layer-1 (`acct_17`) $\to$ Layer-2 (`acct_31`, `acct_32`) $\to$ Layer-3 (`acct_44`).
     - Nodes are color-coded by calibrated mule suspicion ($0.91$ for primary mules).
     - Dashed line represents a **shared device / hardware identifier** linking accounts together.
4. **Section D — The Physical Cash-Out Forecast (Where & When)**:
   - On the **Leaflet Map**, show the red cluster:
     - Predicted H3 Cell: `8928308280fffff` ($p = 0.69$).
     - Identified **4 physical cash-out terminals** (ATMs / micro-ATMs) within a 450-meter radius.
   - Point to the **Excitation Contribution Chart**:
     - Hover over the timeline bars: *"Each bar represents one transfer's contribution to the danger score. Fast split transactions compound the urgency."*

---

### Minute 3: False-Positive Immunity & Cross-Bank Privacy (1:45 – 3:00)

1. **Demonstrate False-Positive Protection (The Judge's #1 Concern)**:
   - Return to the Queue (`/incidents`) and select **`INC-2026-00051`** (`slow_transfer`):
     - Amount is ₹15,000, but transfer velocity is slow.
     - Result: **`GREEN`** ($S = 0.28$).
   - Return to the Queue and select **`repeat_vendor`**:
     - ₹40,000 burst to a commercial vendor.
     - Excitation $S = 3.99$ (hot), but top mule score is only $0.41$ (benign history).
     - **The Fusion Cap triggers**: Automatically steps down from **Red to Amber**.
     - State clearly: *"This is our false-positive brake. A hot burst without an anomalous mule network will never trigger an emergency bank alert."*
2. **Execute Simulated Intervention**:
   - In the Review Panel, select `hold_request` or `patrol_notify` and click **"Simulate Action"**.
   - Show the generated immutable audit ID: `AUD-xxx [SIMULATION]`.
   - *"Human-in-the-loop is mandatory. PRAHARI arms investigators with intelligence, but no account is liened without analyst sign-off."*
3. **Open Federation Demo (`/federation`)**:
   - Show the 3 simulated institutions (`BANK_A`, `BANK_B`, `BANK_C`).
   - Highlight:
     - **Cosine Similarity: 1.00** between federated weights and centralized training.
     - **Raw Tables Shared: `false`**.
     - *"Banks cannot legally share raw transaction ledgers due to privacy and competition regulations. With FedAvg, they train local models and share only feature gradient means."*

---

## 4. The 30-Second Batch Replay Showstopper

If judges ask: *"Does this hold up across a batch of diverse real-world patterns?"*  
Switch to the terminal and execute:

```bash
python stream-simulator/replay_all.py --gateway http://localhost:3000
```

### Live Output Table (12 Scenarios)
```
incident               tier      top cell           window         verdict
INC-2026-00041         Red       8928308280fffff     6/12/19       OK 
INC-2026-00042         Red       8928308281fffff     3/5 /8        OK 
INC-2026-00043         Red       8928308282fffff     8/14/24       OK 
INC-2026-00050         Red       8928308281fffff     3/5 /8        OK 
INC-2026-00088         Critical  8928308280fffff    14/26/43       OK 
INC-2026-00052         Critical  8928308280fffff    13/24/39       OK 
INC-2026-00101         Green     8928308280fffff    15/28/46       OK 
INC-2026-00102         Green     8928308280fffff    15/28/46       OK 
INC-2026-00104         Green     8928308280fffff    16/29/48       OK 
INC-2026-00103         Green     8928308280fffff    15/27/45       OK 
INC-2026-00051         Green     8928308280fffff    15/27/45       OK 
INC-2026-00105         Amber     8928308280fffff    12/21/35       OK 

TP=6 FP=0 TN=5 FN=0 | precision=1.00 recall=1.00 | false-positive rate=0.00
```
Point to the final line: **100% Precision, 100% Recall, 0.00 False Positive Rate** across 4 fraud bursts, 2 active withdrawals, 5 benign controls, and 1 fusion-capped boundary case.

---

## 5. Judge Objection Handling & Technical Q&A

### Q1: "Why not just set a simple transaction amount threshold at banks?"
> *"Because cybercriminals intentionally split transfers into small amounts (₹10,000–₹49,000) to evade PMLA and bank AML thresholds. In our test suite, `business_payment` transfers ₹2,00,000 legitimately and stays Green, while `demo_golden_hour` splits ₹50,000 across 3 accounts and flags Red. **Velocity, fan-out topology, and temporal clustering beat raw transaction amount every single time.**"*

### Q2: "What if the mule account was newly opened yesterday and has zero prior transaction history?"
> *"Traditional bank fraud models rely on historical profiling, which fails against 'sleeper' or fresh mule accounts. PRAHARI uses within-subgraph topology: we measure Layer-1 fan-out velocity, split ratios, and account activation timestamps relative to $t_0$. Even with zero prior history, accounts receiving funds and fanning out within 5 minutes are captured by the unsupervised Isolation Forest ranker."*

### Q3: "How can this generalize to a real city with thousands of ATMs?"
> *"We proved map-independence using `check_osm.py`. We loaded **265 real OpenStreetMap ATMs** across 35 H3 cells in Central Delhi. Because our tiering engine evaluates the map-independent excitation score $S$ rather than raw terminal density, the exact same mathematical threshold separates fraud from normal transactions on real metropolitan coordinates without retraining."*

### Q4: "Banks will never share proprietary ledger data with competing banks. How is this deployable?"
> *"They don't have to. Under our federated learning architecture (Module 5), each bank runs local feature extraction within their own perimeter. Only aggregated class means and counts are shared with the coordinator via privacy-preserving FedAvg. We mathematically verified that this yields **1.00 cosine similarity** with centralized pooled training while sharing zero raw transactions."*

### Q5: "What prevents the model from mistakenly flagging the victim as a mule?"
> *"Victim immunity is enforced by construction in Module 2 and Module 3. The complaint reporting entity (`victim_hash`) serves strictly as the rooted anchor node and is mathematically excluded from anomaly scoring. It is physically impossible for the victim to be scored as a mule."*

---

## 6. Closing Statement

> *"PRAHARI is not another retrospective fraud dashboard that tells you where money went yesterday. It is an operational decision-support framework that gives law enforcement and bank security teams the exact 15-to-30-minute window they need to intercept cybercrime cash-outs before the money is gone."*
