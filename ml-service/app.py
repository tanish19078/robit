"""PRAHARI ml-service: FastAPI wrapper over stdlib core (graph/mule/forecast).

Run:  pip install -r requirements.txt
      uvicorn app:app --port 8000   (from ml-service/)
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from fastapi import FastAPI
    from pydantic import BaseModel
except ImportError:  # core stays importable/testable without web deps
    FastAPI = None

from forecast.hawkes import score_cells
from forecast.quantiles import predict_window
from graph.build import build_khop
from mule.score import score_nodes

HERE = os.path.dirname(os.path.abspath(__file__))


def load_defaults():
    with open(os.path.join(HERE, "..", "data", "config.json")) as f:
        config = json.load(f)
    with open(os.path.join(HERE, "..", "data", "terminals.json")) as f:
        terminals = json.load(f)
    return config, terminals


CONFIG, TERMINALS = load_defaults()
MODEL_VERSION = os.environ.get("MODEL_VERSION", "prahari-0.1-dev")


def run_pipeline(incident, events, at_time=None):
    """Full M2->M4 in-memory run. Returns the decision-object payload (minus tier)."""
    t0 = incident["t0"]
    at_time = at_time or max(e["ts"] for e in events)
    roots = [incident["src_hash"]]
    subgraph = build_khop(events, roots, depth=3)
    mule = score_nodes(subgraph, events, t0, CONFIG["weights"], at_time)
    cells, exc = score_cells(
        events, TERMINALS, incident.get("victim_lat", 28.6285),
        incident.get("victim_lon", 77.2137), at_time,
        CONFIG["sigma_km"], CONFIG["beta_per_min"])
    window = predict_window(exc, n_frontier=len(subgraph["path"]))
    return {"subgraph": subgraph, "mule": mule, "cells": cells,
            "excitation": exc, "window": window,
            "at_time": at_time, "model_version": MODEL_VERSION}


if FastAPI:
    app = FastAPI(title="PRAHARI ml-service v0.1")

    class ForecastReq(BaseModel):
        incident: dict
        events: list
        at_time: str | None = None

    @app.get("/ml/health")
    def health():
        return {"ok": True, "model_version": MODEL_VERSION}

    @app.post("/ml/graph")
    def graph(req: ForecastReq):
        sg = build_khop(req.events, [req.incident["src_hash"]], depth=3)
        return {"nodes": sg["nodes"], "edges": sg["edges"], "path": sg["path"]}

    @app.post("/ml/mule")
    def mule(req: ForecastReq):
        at = req.at_time or max(e["ts"] for e in req.events)
        sg = build_khop(req.events, [req.incident["src_hash"]], depth=3)
        return {"nodes": score_nodes(sg, req.events, req.incident["t0"], CONFIG["weights"], at)}

    @app.post("/ml/forecast")
    def forecast(req: ForecastReq):
        out = run_pipeline(req.incident, req.events, req.at_time)
        return {"probable_cashout_cells": [{k: c[k] for k in ("h3_cell", "probability", "nearby_cashout_points")} for c in out["cells"]],
                "cashout_window_minutes": {"q10": out["window"]["q10"], "median": out["window"]["median"], "q90": out["window"]["q90"]},
                "money_path": out["subgraph"]["path"],
                "suspected_nodes": [n["id"] for n in out["mule"][:3]],
                "mule": out["mule"], "excitation": out["excitation"],
                "model_version": out["model_version"]}
