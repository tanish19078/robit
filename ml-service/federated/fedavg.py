"""3-bank FedAvg over the linear scoring head. Clients share class means + counts
only — never raw events. Head-only demo; encoder federation is roadmap.
"""

import json
import math
import os

from graph.build import build_khop
from mule.score import FEATURES, node_features

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "data")

# client -> fixtures visible in its private ledger
CLIENTS = {
    "BANK_A": ["demo_golden_hour.json"],
    "BANK_B": ["fraud_multi_path.json", "fraud_withdrawal.json"],
    "BANK_C": ["normal_day.json"],
}


def load_fixture(name):
    with open(os.path.join(DATA, name)) as f:
        return json.load(f)


def client_update(fixture_names):
    """Local means + counts. Raw events never leave this function."""
    sum_f = [0.0] * len(FEATURES)
    sum_b = [0.0] * len(FEATURES)
    n_f = n_b = 0
    for name in fixture_names:
        fix = load_fixture(name)
        sg = build_khop(fix["events"], [fix["src_hash"]], depth=3)
        at = max(e["ts"] for e in fix["events"])
        order, rows, roots, _ = node_features(sg, fix["events"], fix["t0"], at)
        gt = fix["ground_truth"]
        fraud = set(gt["true_path"][1:]) if gt.get("true_cell") else set()
        for nid, r in zip(order, rows):
            if nid in roots:
                continue
            vec = [r[k] for k in FEATURES]
            if nid in fraud:
                sum_f = [a + b for a, b in zip(sum_f, vec)]
                n_f += 1
            else:
                sum_b = [a + b for a, b in zip(sum_b, vec)]
                n_b += 1
    mf = [s / n_f for s in sum_f] if n_f else [0.0] * len(FEATURES)
    mb = [s / n_b for s in sum_b] if n_b else [0.0] * len(FEATURES)
    return {"mean_fraud": mf, "mean_benign": mb, "n_fraud": n_f, "n_benign": n_b,
            "n_nodes": n_f + n_b}


def _norm(vec):
    n = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / n for x in vec]


def _cos(a, b):
    denom = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(x * x for x in b))
    return sum(x * y for x, y in zip(a, b)) / (denom or 1.0)


def run_demo():
    updates = {bank: client_update(names) for bank, names in CLIENTS.items()}
    tot_f = sum(u["n_fraud"] for u in updates.values())
    tot_b = sum(u["n_benign"] for u in updates.values())
    agg_f = [sum(u["mean_fraud"][i] * u["n_fraud"] for u in updates.values()) / (tot_f or 1)
             for i in range(len(FEATURES))]
    agg_b = [sum(u["mean_benign"][i] * u["n_benign"] for u in updates.values()) / (tot_b or 1)
             for i in range(len(FEATURES))]
    fed_weights = _norm([a - b for a, b in zip(agg_f, agg_b)])
    pooled = client_update([n for names in CLIENTS.values() for n in names])
    tot_pf = pooled["n_fraud"] or 1
    tot_pb = pooled["n_benign"] or 1
    cen_weights = _norm([a - b for a, b in zip(pooled["mean_fraud"], pooled["mean_benign"])])
    return {"clients": {k: {"n_nodes": v["n_nodes"], "n_fraud": v["n_fraud"], "n_benign": v["n_benign"]}
                        for k, v in updates.items()},
            "features": FEATURES,
            "federated_weights": [round(w, 4) for w in fed_weights],
            "centralized_weights": [round(w, 4) for w in cen_weights],
            "cosine_similarity": round(_cos(fed_weights, cen_weights), 4),
            "raw_tables_shared": False,
            "scope": "linear scoring head only; encoder federation is roadmap"}


if __name__ == "__main__":
    out = run_demo()
    print(json.dumps(out, indent=1))
