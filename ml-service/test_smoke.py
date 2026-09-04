"""Smoke test: stdlib only. Run:  python test_smoke.py   (from ml-service/)"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import run_pipeline  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    with open(os.path.join(HERE, "..", "data", name)) as f:
        return json.load(f)


def check_fixture(name, expect_red):
    fix = load(name)
    incident = {k: fix[k] for k in ("incident_id", "t0", "amount", "src_hash", "channel")}
    incident["victim_lat"] = fix.get("victim_lat", 28.6285)
    incident["victim_lon"] = fix.get("victim_lon", 77.2137)
    at = max(e["ts"] for e in fix["events"])
    out = run_pipeline(incident, fix["events"], at)

    top = out["cells"][0]
    gt = fix["ground_truth"]
    print(f"[{name}] top_cell={top['h3_cell']} p={top['probability']} raw={top['raw']} "
          f"window={out['window']} path={out['subgraph']['path']}")
    print(f"[{name}] mule_top3={[(n['id'], n['final']) for n in out['mule'][:3]]}")

    assert out["window"]["q10"] <= out["window"]["median"] <= out["window"]["q90"], "quantile order"
    if gt["true_cell"]:
        assert top["h3_cell"] == gt["true_cell"], f"wrong cell: {top['h3_cell']}"
        assert top["raw"] > 0.5, f"fraud intensity too low: {top['raw']}"
        assert set(out["subgraph"]["path"]) >= set(gt["true_path"][:3]), "path missing"
        fraud_ids = set(gt["true_path"][1:])
        top3 = {n["id"] for n in out["mule"][:3]}
        assert fraud_ids & top3, "no fraud node in top-3"
        print(f"[{name}] OK (fraud detected, expect_red={expect_red})")
    else:
        assert top["raw"] < 0.35, f"negative case too hot: raw={top['raw']}"
        print(f"[{name}] OK (negative stays Green-cool)")


if __name__ == "__main__":
    check_fixture("demo_golden_hour.json", expect_red=True)
    check_fixture("fraud_multi_path.json", expect_red=True)
    check_fixture("fraud_withdrawal.json", expect_red=True)
    check_fixture("normal_day.json", expect_red=False)
    print("SMOKE PASS")
