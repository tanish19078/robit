"""E2E: boot real ml + gateway, replay 3 scenarios, assert tiers. Stdlib only."""

import json
import os
import subprocess
import sys
import tempfile
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


def replay(base, name):
    with open(os.path.join(ROOT, "data", name + ".json")) as f:
        sc = json.load(f)
    inc = {"incident_id": sc["incident_id"], "t0": sc["t0"], "amount": sc["amount"],
           "src_hash": sc["src_hash"], "channel": sc["channel"],
           "victim_lat": sc.get("victim_lat"), "victim_lon": sc.get("victim_lon")}
    api("POST", base + "/api/incidents", inc)
    for e in sc["events"]:
        routes = {"transfer": "/transactions", "withdrawal": "/withdrawals", "shared_attribute": "/attributes"}
        api("POST", base + "/api/events" + routes[e["type"]], e)
    _, fc = api("GET", base + f"/api/incidents/{sc['incident_id']}/forecast")
    return sc, fc


def main():
    ml = subprocess.Popen([sys.executable, "-m", "uvicorn", "app:app", "--port", str(ML_PORT)],
                          cwd=os.path.join(ROOT, "ml-service"),
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    env = dict(os.environ, PORT=str(GW_PORT), ML_URL=f"http://localhost:{ML_PORT}")
    store_fd, store_path = tempfile.mkstemp(prefix="prahari-e2e-", suffix=".json")
    os.close(store_fd)
    os.remove(store_path)
    env["STORE_FILE"] = store_path
    gw = subprocess.Popen(["node", "server.js"], cwd=os.path.join(ROOT, "gateway"),
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
    try:
        wait(f"http://localhost:{ML_PORT}/ml/health")
        wait(f"http://localhost:{GW_PORT}/health")
        base = f"http://localhost:{GW_PORT}"
        sc, fc = replay(base, "demo_golden_hour")
        try:
            api("POST", base + "/api/events/transactions",
                {"event_id": "bad", "incident_id": sc["incident_id"], "ts": "2026-01-01T09:00:00Z",
                 "src": "x", "dst": "y", "amount": 1})
            raise SystemExit("FAIL: pre-t0 event accepted")
        except urllib.error.HTTPError as he:
            assert he.code == 400, he.code
        st, body = api("POST", base + "/api/events/transactions", sc["events"][0])
        assert st == 202 and body.get("duplicate") == sc["events"][0]["event_id"], (st, body)
        assert fc["risk_tier"] == "Red", fc["risk_tier"]
        assert fc["probable_cashout_cells"][0]["h3_cell"] == sc["ground_truth"]["true_cell"], fc
        w = fc["cashout_window_minutes"]
        assert w["q10"] <= w["median"] <= w["q90"], w
        assert fc["human_review_required"] is True
        assert isinstance(fc.get("alert_latency_ms"), int) and fc["alert_latency_ms"] >= 0
        assert fc.get("intensity") is not None
        print("E2E fraud:", fc["risk_tier"], fc["probable_cashout_cells"][0], w, fc["money_path"])

        sc2, fc2 = replay(base, "fraud_withdrawal")
        assert fc2["risk_tier"] == "Critical", fc2["risk_tier"]
        print("E2E withdrawal:", fc2["risk_tier"], fc2["probable_cashout_cells"][0])

        sc3, fc3 = replay(base, "normal_day")
        assert fc3["risk_tier"] == "Green", fc3["risk_tier"]
        print("E2E negative:", fc3["risk_tier"], fc3["probable_cashout_cells"][0])

        sc4, fc4 = replay(base, "repeat_vendor")
        assert fc4["risk_tier"] == "Amber", fc4["risk_tier"]
        print("E2E fusion-cap:", fc4["risk_tier"], "(hot burst, cool peer)")

        _, m = api("GET", base + "/api/metrics")
        assert m["incidents"] == 4, m
        assert m["alerts_by_tier"] == {"Red": 1, "Critical": 1, "Green": 1, "Amber": 1}, m
        assert isinstance(m.get("avg_latency_ms"), int), m
        _, lst = api("GET", base + "/api/incidents")
        got = {i["incident_id"]: i["n_events"] for i in lst["incidents"]}
        assert got == {sc["incident_id"]: len(sc["events"]),
                       sc2["incident_id"]: len(sc2["events"]),
                       sc3["incident_id"]: len(sc3["events"]),
                       sc4["incident_id"]: len(sc4["events"])}, got
        tiers = {i["incident_id"]: i["last_tier"] for i in lst["incidents"]}
        assert tiers == {sc["incident_id"]: "Red", sc2["incident_id"]: "Critical",
                         sc3["incident_id"]: "Green", sc4["incident_id"]: "Amber"}, tiers
        print("E2E PASS")
    finally:
        gw.terminate()
        ml.terminate()
        gw.wait()
        ml.wait()
        if os.path.exists(store_path):
            os.remove(store_path)


if __name__ == "__main__":
    import urllib.error  # noqa: E402  (kept here: e2e file, stdlib only)
    main()
