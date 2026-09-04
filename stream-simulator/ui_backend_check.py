"""Verify new UI-backed endpoints: incident list + static dashboard ids."""

import json
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def wait(url, tries=40):
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                return json.loads(r.read().decode())
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("never came up: " + url)


def main():
    ml = subprocess.Popen([sys.executable, "-m", "uvicorn", "app:app", "--port", "8005"],
                          cwd=os.path.join(ROOT, "ml-service"),
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    env = dict(os.environ, PORT="3005", ML_URL="http://localhost:8005")
    gw = subprocess.Popen(["node", "server.js"], cwd=os.path.join(ROOT, "gateway"),
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
    try:
        wait("http://localhost:8005/ml/health")
        wait("http://localhost:3005/health")
        with open(os.path.join(ROOT, "data", "demo_golden_hour.json")) as f:
            sc = json.load(f)
        inc = {"incident_id": sc["incident_id"], "t0": sc["t0"], "amount": sc["amount"],
               "src_hash": sc["src_hash"], "channel": sc["channel"]}
        urllib.request.urlopen(urllib.request.Request(
            "http://localhost:3005/api/incidents", data=json.dumps(inc).encode(),
            headers={"content-type": "application/json"}, method="POST")).read()
        with urllib.request.urlopen("http://localhost:3005/api/incidents", timeout=5) as r:
            lst = json.loads(r.read().decode())
        assert lst["incidents"][0]["incident_id"] == sc["incident_id"], lst
        assert lst["incidents"][0]["n_events"] == 0, lst
        with urllib.request.urlopen("http://localhost:3005/", timeout=5) as r:
            html = r.read().decode()
        for token in ("graphSvg", "incSel", "mules", "metrics"):
            assert token in html, token
        print("UI-BACKEND PASS:", lst["incidents"])
    finally:
        gw.terminate()
        ml.terminate()
        gw.wait()
        ml.wait()


if __name__ == "__main__":
    main()
