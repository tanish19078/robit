"""E2E check: boots real ml-service + gateway as subprocesses, replays fixture, asserts.

Stdlib only. Run:  python e2e_check.py   (from stream-simulator/)
"""

import json
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ML_PORT, GW_PORT = 8001, 3001


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
        return r.status, json.loads(r.read().decode() or "{}")


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
        # schema guard: ts before t0 must 400
        try:
            api("POST", base + "/api/events/transactions",
                {"event_id": "bad", "incident_id": sc["incident_id"], "ts": "2026-01-01T09:00:00Z",
                 "src": "x", "dst": "y", "amount": 1})
            raise SystemExit("FAIL: pre-t0 event accepted")
        except urllib.error.HTTPError as he:
            assert he.code == 400, he.code
        _, fc = api("GET", base + f"/api/incidents/{sc['incident_id']}/forecast")
        assert fc["risk_tier"] == "Red", fc["risk_tier"]
        assert fc["probable_cashout_cells"][0]["h3_cell"] == sc["ground_truth"]["true_cell"], fc
        w = fc["cashout_window_minutes"]
        assert w["q10"] <= w["median"] <= w["q90"], w
        assert fc["human_review_required"] is True
        _, m = api("GET", base + "/api/metrics")
        assert m["incidents"] == 1 and m["events"] == len(sc["events"]), m
        print("E2E PASS:", fc["risk_tier"], fc["probable_cashout_cells"][0], w, fc["money_path"])
    finally:
        gw.terminate()
        ml.terminate()
        gw.wait()
        ml.wait()


if __name__ == "__main__":
    import urllib.error  # noqa: E402  (kept here: e2e file, stdlib only)
    main()
