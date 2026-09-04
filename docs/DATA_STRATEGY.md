# PRAHARI Data Strategy: from synthetic demo to authorized pilot

Live NCRP/CBS ledgers are regulated (IT Act, DPDP Act 2023, RBI cyber-security
framework) and will not be handed to a student team on request. This doc is the
honest ladder we present to judges and to institutions.

## Rung 0 — Synthetic fixtures (done, always runnable)

`data/*.json`: 3 fraud shapes + 1 negative, ground truth included, tagged SIMULATION.
Proves the loop; doubles as regression tests (`test_smoke.py`, `e2e_check.py`).

## Rung 1 — Public / proxy data (no permission needed)

| Source | Status | Use |
|---|---|---|
| OSM ATM/bank coords (`data/fetch_osm_terminals.py`) | DONE: 265 terminals, 35 H3-8 cells, central Delhi (ODbL) | Real map + cell layout; swap via `ML_TERMINALS` / `TERMINALS_FILE` env |
| RBI annual fraud reports, NPCI public stats | TODO | Base-rate priors, cited numbers for the deck |
| PaySim / AMLSim patterns | TODO (`ml-service` loader into canonical schema) | Foreign-data ingestion proof |

## Rung 2 — Authorized anonymized sample (outreach in progress)

Ask (via college SIH SPOC / mentor → state cyber cell or bank innovation team):

1. Hourly per-cluster ATM withdrawal counts (aggregated, no accounts) — calibrates `base_prior`.
2. Small set of historical mule subgraphs with hashed IDs + shifted timestamps — trains the ranker.
3. Federated pilot: our `/ml/federated/demo` runs inside their network; only weight
   updates leave (see `ml-service/federated/fedavg.py`, leakage-tested).

Offer upfront: on-prem/federated execution, no raw rows leave their network,
NDA + academic-use-only, DPDP-aligned audit log (every prediction carries
`model_version` + reviewer decision in `audit_log`).

Draft request letter: `docs/DATA_REQUEST_LETTER.md`.

## Rung 3 — Live pilot (post-SIH, MoU)

NCRP/CFCFRMS webhook + bank-side connector under MoU, security review, DPDP
compliance. Architecture isolates this to adapter code: the mock adapter
(`stream-simulator/`) is swapped, nothing upstream changes.
