"""Boot ml:8000 + gateway:3000, replay the demo, stay up until Ctrl+C."""

import os
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))


def wait(url, tries=60):
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                r.read()
                return True
        except Exception:
            time.sleep(0.5)
    return False


ml = subprocess.Popen([sys.executable, "-m", "uvicorn", "app:app", "--port", "8000"],
                      cwd=os.path.join(ROOT, "ml-service"))
gw = subprocess.Popen(["node", "server.js"], cwd=os.path.join(ROOT, "gateway"),
                      env=dict(os.environ, PORT="3000", ML_URL="http://localhost:8000"))
try:
    assert wait("http://localhost:8000/ml/health"), "ml-service never came up (install: pip install -r ml-service/requirements.txt)"
    assert wait("http://localhost:3000/health"), "gateway never came up (install: cd gateway && npm install)"
    print("both services up; replaying demo scenario...")
    rc = subprocess.call([sys.executable, os.path.join(ROOT, "stream-simulator", "replay_all.py"),
                          "--scenario", "demo_golden_hour", "--speed", "20",
                          "--gateway", "http://localhost:3000"])
    print(f"replay exit={rc}")
    print("=" * 60)
    print("READY — open http://localhost:3000/ and press Forecast")
    print("Holding stack up. Press Ctrl+C here to stop everything.")
    print("=" * 60)
    while True:
        time.sleep(10)
        assert ml.poll() is None, "ml-service died, see its window/log"
        assert gw.poll() is None, "gateway died, see its window/log"
finally:
    for p in (gw, ml):
        try:
            p.terminate()
        except Exception:
            pass
    print("stack stopped")
