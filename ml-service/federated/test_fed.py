"""Run:  python test_fed.py   (from ml-service/)"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from federated.fedavg import run_demo  # noqa: E402

out = run_demo()
assert out["cosine_similarity"] > 0.99, out
assert out["raw_tables_shared"] is False
blob = json.dumps(out)
for leak in ("victim_hash", "acct_hash", "evt_", "transfer", "2026-01"):
    assert leak not in blob, f"possible raw leakage: {leak}"
print("FED PASS: cosine", out["cosine_similarity"], "| clients",
      {k: v["n_nodes"] for k, v in out["clients"].items()})
