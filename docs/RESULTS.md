# Measured results (paste from real runs only — no invented numbers)

## v0.3 — 9-incident pack, burst-weighted S + fusion caps

`python test_smoke.py` (ml-service/):

- demo_golden_hour: exc=7.74, mule max 0.909 → Red, cell `...80fffff`, 6/12/19
- fraud_multi_path: exc=11.78, mule max 0.846 → Red, cell `...81fffff`, 3/5/8
- fraud_uptown: exc=6.35, mule max 0.909 → Red, cell `...82fffff`, 8/14/24
- fraud_withdrawal: exc=1.07 + live withdrawal → Critical, cell `...80fffff`
- normal_day / salary_rent / family_remittance / business_payment:
  exc 0.10–1.00 → Green
- repeat_vendor: exc=3.99 but mule max 0.413 → Amber via fusion cap
- SMOKE PASS

`python e2e_check.py`: tiers {Red, Critical, Green, Amber} exactly as above,
schema guard 400, incident list + metrics exact — E2E PASS

`python replay_all.py` (live 9-report batch):
TP=4 FP=0 TN=5 FN=0 | precision 1.00 recall 1.00 | FP rate 0.00

`python federated/test_fed.py`: cosine 1.0, no raw-id leakage — FED PASS

`python check_osm.py` (265 real OSM ATMs, 35 cells): pipeline runs unmodified,
S identical across maps — OSM-COMPAT PASS

## Findings that changed the design (both caught by tests)

1. Normalized cell share always sums to 1 → quiet incidents scored ~0.5.
   Tiers moved to absolute signal.
2. Raw cell lambda does not transfer across maps (negative: 0.24 on 3-cell
   fixture map vs 0.66 on 35-cell OSM map). Excitation S is map-independent.
3. Single large transfers spiked S (at_time = last event ⇒ latest transfer
   always full weight). Burst-weighting `(1 + transfers within ±5 min)` fixes
   it: lone ₹2L payment S=1.0 Green; 4-way split S=7.7 Red.
4. Fusion cap: hot burst + cool peer steps down a tier (repeat_vendor:
   exc 3.99 → Amber). Cuts in `data/config.json`, fixture-calibrated —
   recalibrate per deployment.
