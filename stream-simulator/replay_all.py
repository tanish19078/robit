"""Replay scenarios into a gateway, print verdict table + confusion.

Positive = tier in (Red, Critical). --scenario repeats (default: all 9),
--speed paces events for live narration (0 = as fast as possible).
Targets a RUNNING gateway (e.g. hold_demo.py).
"""

import argparse
import json
import os
import time
import urllib.error
import urllib.request

SCENARIOS = ["demo_golden_hour", "fraud_multi_path", "fraud_uptown",
             "fraud_withdrawal", "normal_day", "salary_rent",
             "family_remittance", "business_payment", "repeat_vendor"]
ROUTES = {"transfer": "/api/events/transactions", "withdrawal": "/api/events/withdrawals",
          "shared_attribute": "/api/events/attributes"}


def api(method, base, path, obj=None):
    req = urllib.request.Request(base + path,
                                 data=json.dumps(obj).encode() if obj is not None else None,
                                 headers={"content-type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as he:
        return he.code, {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gateway", default="http://localhost:3000")
    ap.add_argument("--scenario", action="append", default=None)
    ap.add_argument("--speed", type=float, default=0.0)
    args = ap.parse_args()
    base, root = args.gateway, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
    names = args.scenario or SCENARIOS

    print(f"{'incident':22} {'tier':9} {'top cell':18} {'window':14} verdict")
    tp = fp = tn = fn = 0
    for name in names:
        with open(os.path.join(root, name + ".json")) as f:
            sc = json.load(f)
        inc = {k: sc[k] for k in ("incident_id", "t0", "amount", "src_hash", "channel") if k in sc}
        inc["victim_lat"] = sc.get("victim_lat", 28.6285)
        inc["victim_lon"] = sc.get("victim_lon", 77.2137)
        st, _ = api("POST", base, "/api/incidents", inc)
        if st == 409:
            pass  # already replayed into this gateway: reuse, forecast again
        elif st != 201:
            print(f"{sc['incident_id']:22} ERROR posting incident ({st})"); continue
        for e in sc["events"]:
            st, _ = api("POST", base, ROUTES[e["type"]], e)
            if st not in (202,):
                print(f"{sc['incident_id']:22} ERROR event {e['event_id']} ({st})")
            if args.speed > 0:
                time.sleep(min(2.0, 60.0 / args.speed / max(1, len(sc["events"]))))
        st, fc = api("GET", base, f"/api/incidents/{sc['incident_id']}/forecast")
        if st != 200:
            print(f"{sc['incident_id']:22} ERROR forecast ({st})"); continue
        gt, tier = sc["ground_truth"], fc["risk_tier"]
        top = fc["probable_cashout_cells"][0]["h3_cell"]
        w = fc["cashout_window_minutes"]
        fraud = gt.get("true_cell") is not None
        pos = tier in ("Red", "Critical")
        ok = (pos == fraud) and (not fraud or top == gt["true_cell"])
        tp, fp, tn, fn = tp + (ok and fraud), fp + (pos and not fraud), \
            tn + (ok and not fraud), fn + (fraud and not pos)
        mark = "OK " if ok else "MISS"
        print(f"{sc['incident_id']:22} {tier:9} {top:18} {w['q10']:>3}/{w['median']:<3}/{w['q90']:<4} {mark}")
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    print(f"\nTP={tp} FP={fp} TN={tn} FN={fn} | precision={prec:.2f} recall={rec:.2f} | "
          f"false-positive rate={fp / (fp + tn) if fp + tn else 0:.2f}")


if __name__ == "__main__":
    main()
