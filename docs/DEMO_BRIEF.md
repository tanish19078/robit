# PRAHARI Judge Demo Brief (3 minutes + Q&A)

What we claim: a complaint starts a clock; before cash is out, the dashboard
shows WHERE (ranked H3 cell), WHEN (time window), WHO (mule path) and WHY
(evidence) — for a human to approve action. Everything below is replayable live.

## Setup (before judges arrive)

```powershell
cd robit
python hold_demo.py          # ml:8000 + gateway:3000, demo incident pre-loaded
```

Open `http://localhost:3000/`. If the venue has no internet, the map tiles stay
blank but every panel still works (say so upfront — honesty scores).

## The 3-minute run

| Time | Do | Say |
|---|---|---|
| 0:00 | Point at header: SIMULATION tag | "Synthetic data, clearly labelled — real ledgers need authorization we don't claim." |
| 0:20 | Click `INC-2026-00041` in the queue (auto-forecasts) | "Complaint filed 10:00. Money splits across Layer-2 by 10:03." |
| 0:50 | Read the badge: **Red, 4/8/13 min**. Trace the red path on the SVG graph | "Burst-weighted excitation: four rapid transfers, not one big amount, is what fires Red." |
| 1:20 | Map: red cluster of 4 terminals; cells ranked with probabilities | "Top cell holds the true cash-out in all 3 fraud replays — different cells each time." |
| 1:50 | Evidence list + mule table (baseline + learned) | "Two independent signals must agree: hot burst AND a suspicious peer. That fusion is our false-positive brake." |
| 2:10 | Click `INC-2026-00103` (₹2L single payment) → **Green** | "A lone large transfer stays Green — no burst, no mule. Old logic flagged this." |
| 2:30 | Click `INC-2026-00105` (5 rapid vendor payments) → **Amber** | "Hot burst but a boring peer: stepped down to analyst review, not a bank alert." |
| 2:50 | **Escalate** → **Simulate step_up** → show audit id | "Nothing freezes without a human. Every step is audited with model version." |

## The 9-report batch (FP story, 30 seconds)

```powershell
python stream-simulator/replay_all.py --gateway http://localhost:3000
```

Live table, current measured result: **TP=4 FP=0 TN=5 FN=0, precision 1.00,
recall 1.00, FP rate 0.00** — 3 frauds Red across 3 different H3 cells,
1 withdrawal Critical, 4 negatives Green, 1 capped Amber. If a row ever shows
MISS, say so and open the evidence — a caught miss beats a hidden one.

## Q&A cheat sheet

- "Why not just amount thresholds?" → business_payment (₹2L, Green) vs
  demo (₹50k split 4 ways, Red). Structure + velocity beat amount.
- "New mules with no history?" → IsolationForest peer rank inside the incident
  subgraph; victims excluded from suspicion by construction.
- "Real data?" → `docs/DATA_STRATEGY.md`: OSM map live (265 real ATMs),
  outreach letter ready, federated demo runs without pooling ledgers.
- "False positives at scale?" → fusion caps + Green-by-default + analyst review
  + audit; cuts in `data/config.json`, recalibrated per deployment (see
  `docs/RESULTS.md` transfer finding).
- "What breaks?" → map tiles need internet; thresholds are fixture-calibrated
  (4 fraud shapes) and must be recalibrated on real volume.
