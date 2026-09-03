"""Show exactly what the dashboard renders: boots real ml+gateway, replays fixture,
prints each UI panel's payload. Run: python show_ui.py (from stream-simulator/)."""

import json
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ML_PORT, GW_PORT = 8003, 3003


def wait(url, tries=40):
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                return json.loads(r.read().decode())
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("never came up: " + url)


def api(method, url, obj=None):
    req = urllib.request.Request(url, data=json.dumps(obj).encode() if obj is not None else None,
                                 headers={"content-type": "application/json"}, method=method)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode() or "{}")


def main():
    ml = subprocess.Popen([sys.executable, "-m", "uvicorn", "app:app", "--port", str(ML_PORT)],
                          cwd=os.path.join(ROOT, "ml-service"),
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    env = dict(os.environ, PORT=str(GW_PORT), ML_URL=f"http://localhost:{ML_PORT}")
    gw = subprocess.Popen(["node", "server.js"], cwd=os.path.join(ROOT, "gateway"),
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
    try:
        wait(f"http://localhost:{ML_PORT}/ml/health")
        wait(f"http://localhost:{GW_PORT}/health")
        base = f"http://localhost:{GW_PORT}"
        with open(os.path.join(ROOT, "data", "demo_golden_hour.json")) as f:
            sc = json.load(f)
        inc = {"incident_id": sc["incident_id"], "t0": sc["t0"], "amount": sc["amount"],
               "src_hash": sc["src_hash"], "channel": sc["channel"],
               "victim_lat": sc.get("victim_lat"), "victim_lon": sc.get("victim_lon")}
        api("POST", base + "/api/incidents", inc)
        for e in sc["events"]:
            path = "/api/events/withdrawals" if e["type"] == "withdrawal" else "/api/events/transactions"
            api("POST", base + path, e)

        g = api("GET", base + f"/api/incidents/{sc['incident_id']}/graph")
        fc = api("GET", base + f"/api/incidents/{sc['incident_id']}/forecast")
        terms = api("GET", base + "/api/terminals")
        print("== [Graph button] raw panel ==")
        print("nodes:", [(n["id"], "hop" + str(n["hop"])) for n in g["nodes"]])
        print("path:", " -> ".join(g["path"]))
        print("== [Forecast button] left panel ==")
        w = fc["cashout_window_minutes"]
        print(f"TIER BADGE: {fc['risk_tier']} — {w['q10']}/{w['median']}/{w['q90']} min")
        print("CELLS:")
        for c in fc["probable_cashout_cells"]:
            print(f"  {c['h3_cell']} p={c['probability']} ({c['nearby_cashout_points']} terminals)")
        print("EVIDENCE:")
        for ev in fc["evidence"]:
            print(f"  - {ev}")
        print("== [Map] ==")
        print(f"{len(terms['terminals'])} terminal dots; red = {fc['probable_cashout_cells'][0]['h3_cell']}")
        r = api("POST", base + f"/api/alerts/{fc['alert_id']}/escalate", {"by": "analyst", "reason": "demo"})
        print("== [Escalate] ==", r["alert_id"], "->", r["status"])
        s = api("POST", base + "/api/actions/simulate", {"alert_id": fc["alert_id"], "action": "step_up"})
        print("== [Simulate] ==", s["simulated_action"], s["audit_id"])
    finally:
        gw.terminate()
        ml.terminate()
        gw.wait()
        ml.wait()


if __name__ == "__main__":
    main()
