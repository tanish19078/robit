"""Validate the pipeline against real OSM terminals (no server needed).

Run:  python check_osm.py   (from stream-simulator/)
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml-service"))
from forecast.hawkes import cell_table, score_cells  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(ROOT, "data", "terminals_osm_delhi.json")) as f:
    terms = json.load(f)
cells = cell_table(terms)
print(f"osm: {len(terms)} terminals -> {len(cells)} cells")

for name in ("demo_golden_hour.json", "fraud_multi_path.json", "fraud_withdrawal.json", "normal_day.json"):
    with open(os.path.join(ROOT, "data", name)) as f:
        fix = json.load(f)
    at = max(e["ts"] for e in fix["events"])
    ranked, exc = score_cells(fix["events"], terms, fix.get("victim_lat", 28.6285),
                              fix.get("victim_lon", 77.2137), at, 1.5, 0.12)
    top = ranked[0]
    print(f"[{name}] top={top['h3_cell']} p={top['probability']} raw={top['raw']} exc={exc}")
print("OSM-COMPAT PASS")
