"""Regression over all fixtures: true cell first, exc cuts, quantile order. Stdlib."""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import run_pipeline  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    with open(os.path.join(HERE, "..", "data", name)) as f:
        return json.load(f)


def max_final(out):
    return max([n["final"] for n in out["mule"]] or [0.0])


def check_fixture(name, mode):
    """mode: red | critical | green | capped (hot burst, cool peer)."""
    fix = load(name)
    incident = {k: fix[k] for k in ("incident_id", "t0", "amount", "src_hash", "channel")}
    incident["victim_lat"] = fix.get("victim_lat", 28.6285)
    incident["victim_lon"] = fix.get("victim_lon", 77.2137)
    at = max(e["ts"] for e in fix["events"])
    out = run_pipeline(incident, fix["events"], at)

    top = out["cells"][0]
    gt = fix["ground_truth"]
    print(f"[{name}] top_cell={top['h3_cell']} p={top['probability']} "
          f"exc={out['excitation']} maxFinal={max_final(out)} window={out['window']}")
    print(f"[{name}] path={out['subgraph']['path']}")

    assert out["window"]["q10"] <= out["window"]["median"] <= out["window"]["q90"], "quantile order"
    if mode in ("red", "critical"):
        assert top["h3_cell"] == gt["true_cell"], f"wrong cell: {top['h3_cell']}"
        assert set(out["subgraph"]["path"]) >= set(gt["true_path"][:3]), "path missing"
        fraud_ids = set(gt["true_path"][1:])
        top3 = {n["id"] for n in out["mule"][:3]}
        assert fraud_ids & top3, "no fraud node in top-3"
    if mode == "red":
        assert out["excitation"] > 2.0, f"fraud imminence too low: {out['excitation']}"
        assert max_final(out) >= 0.5, "fraud peer too cool"
        print(f"[{name}] OK (red)")
    elif mode == "critical":
        assert any(e["type"] == "withdrawal" for e in fix["events"]), "no live withdrawal"
        print(f"[{name}] OK (critical via live withdrawal)")
    elif mode == "green":
        assert out["excitation"] < 1.2, f"negative too hot: exc={out['excitation']}"
        print(f"[{name}] OK (green)")
    elif mode == "capped":
        assert out["excitation"] > 2.0, f"cap test needs hot burst: {out['excitation']}"
        assert max_final(out) < 0.5, f"cap test needs cool peer: {max_final(out)}"
        print(f"[{name}] OK (amber via fusion cap)")


FIXTURES = [
    ("demo_golden_hour.json", "red"),
    ("fraud_multi_path.json", "red"),
    ("fraud_uptown.json", "red"),
    ("fraud_fanout.json", "red"),
    ("fraud_withdrawal.json", "critical"),
    ("dual_withdrawal.json", "critical"),
    ("normal_day.json", "green"),
    ("salary_rent.json", "green"),
    ("family_remittance.json", "green"),
    ("business_payment.json", "green"),
    ("slow_transfer.json", "green"),
    ("repeat_vendor.json", "capped"),
]


def check_fixture_ids():
    """incident_ids must be unique across fixtures, and events must point at their own.

    A collision is invisible to the rest of this file, because every fixture runs
    in isolation here and never shares an id space. It is equally invisible to
    e2e_check.py, which replays only four scenarios. But /api/demo/seed loads all
    twelve into one gateway: the second fixture to claim an id hit the duplicate
    guard, kept the first fixture's t0, and every one of its events was then
    rejected by the causality check -- dropping that scenario from the demo
    entirely. normal_day and dual_withdrawal both claimed INC-2026-00052 this way.
    """
    seen = {}
    for name, _mode in FIXTURES:
        fix = load(name)
        iid = fix["incident_id"]
        assert iid not in seen, f"{name} reuses incident_id {iid} (held by {seen[iid]})"
        seen[iid] = name
        for e in fix["events"]:
            assert e["incident_id"] == iid, \
                f"{name}: event {e['event_id']} carries incident_id {e['incident_id']}, expected {iid}"
    print(f"[fixture-ids] OK ({len(seen)} unique ids across {len(FIXTURES)} fixtures)")


if __name__ == "__main__":
    check_fixture_ids()
    for name, mode in FIXTURES:
        check_fixture(name, mode)
    print("SMOKE PASS")

