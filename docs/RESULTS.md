# Measured results (paste from real runs only — no invented numbers)

## v0.2 — 2026-09-04 night build, laptop CPU, file-backed store, 4 fixtures

`python test_smoke.py` (ml-service/):

- demo_golden_hour: cell `8928308280fffff` p=0.672, exc=1.934, window 12/22/37,
  path victim→17→31→44, mule finals 0.909/0.670/0.493 (all fraud, victim 0.218)
- fraud_multi_path: cell `8928308281fffff` p=0.581, exc=2.944, window 10/17/29,
  path victim→61→62→64, mule finals 0.846/0.629/0.485
- fraud_withdrawal: cell `8928308280fffff` p=0.623, exc=0.533, window 17/30/50
- normal_day: exc=0.161, mule max 0.366 → Green-cool
- SMOKE PASS

`python e2e_check.py` (real ml-service + gateway):

- fraud → Red, withdrawal → Critical, negative → Green
- pre-t0 event rejected 400, metrics counts exact {Red:1, Critical:1, Green:1}
- E2E PASS

`python federated/test_fed.py`:

- 3-bank FedAvg head vs centralized: cosine 1.0, no raw-id leakage in payload
- FED PASS

`python check_osm.py` (265 real OSM ATMs, 35 H3-8 cells, central Delhi):

- pipeline runs unmodified; excitation S identical across maps (map-independent ✓)
- fraud exc 1.93/2.94/0.53 vs negative 0.16 — same ordering as fixture map
- OSM-COMPAT PASS

## Transfer finding (2026-09-04): tiers run on excitation S, not cell share

1. Normalized cell share always sums to 1 → quiet incidents scored ~0.5 (Amber).
   Fixed by tiering on absolute signal.
2. Raw cell lambda does NOT transfer across maps: negative fixture hits raw 0.66
   on the 35-cell OSM map vs 0.24 on the 3-cell fixture map.
3. Excitation S is map-independent (same values on both maps) and separates
   fraud (0.53/1.93/2.94) from negative (0.16). Tier cuts (config.json):
   Green <0.2 · Amber 0.2–0.4 · Red >0.4 · Critical = live withdrawal signal.
   Cuts are fixture-calibrated; recalibrate per deployment with `check_osm.py`-style runs.
