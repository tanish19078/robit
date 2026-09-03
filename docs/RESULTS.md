# Measured results (paste from real runs only — no invented numbers)

## v0.1 — 2026-09-03, laptop CPU, in-memory store, synthetic fixtures

`python test_smoke.py` (ml-service/):

- demo_golden_hour: top_cell `8928308280fffff` p=0.672, window 12/22/37,
  path victim→17→31→44, mule top-3 all fraud (0.711/0.599/0.550)
- normal_day: top p=0.54 (below Red 0.65), mule max 0.442 → stays cool
- SMOKE PASS

`python e2e_check.py` (stream-simulator/, real ml-service :8001 + gateway :3001):

- forecast tier Red, true cell first, q10<=median<=q90, human_review_required=true
- pre-t0 event rejected 400, /api/metrics counts correct
- E2E PASS
