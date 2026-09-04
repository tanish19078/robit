"""Replay a scenario fixture into the gateway, print the forecast. Stdlib only."""

import argparse
import json
import os
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def post(base, path, obj):
    req = urllib.request.Request(base + path, data=json.dumps(obj).encode(),
                                 headers={"content-type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        return r.status, json.loads(r.read().decode() or "{}")


def get(base, path):
    with urllib.request.urlopen(base + path) as r:
        return json.loads(r.read().decode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", default="demo_golden_hour")
    ap.add_argument("--speed", type=float, default=20.0)
    ap.add_argument("--gateway", default="http://localhost:3000")
    args = ap.parse_args()

    with open(os.path.join(HERE, "..", "data", args.scenario + ".json")) as f:
        sc = json.load(f)

    inc = {k: sc[k] for k in ("incident_id", "t0", "amount", "src_hash", "channel")
           if k in sc}
    inc["victim_lat"] = sc.get("victim_lat", 28.6285)
    inc["victim_lon"] = sc.get("victim_lon", 77.2137)
    try:
        post(args.gateway, "/api/incidents", inc)
        print("incident:", inc["incident_id"])
    except Exception as e:
        print("incident post skipped/exists:", e)

    for e in sc["events"]:
        path = "/api/events/withdrawals" if e["type"] == "withdrawal" else "/api/events/transactions"
        post(args.gateway, path, e)
        print("sent", e["event_id"], e["type"], e["ts"])
        time.sleep(0.5 if args.speed <= 0 else min(2.0, 60.0 / args.speed / max(1, len(sc["events"]))))

    fc = get(args.gateway, f"/api/incidents/{inc['incident_id']}/forecast")
    print("\nFORECAST tier:", fc["risk_tier"])
    print("top cell:", fc["probable_cashout_cells"][0])
    print("window:", fc["cashout_window_minutes"])
    print("path:", fc["money_path"])
    print("alert:", fc["alert_id"], "| audit via /api/metrics + gateway log [SIMULATION]")


if __name__ == "__main__":
    main()
