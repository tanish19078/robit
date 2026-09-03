"""M3: mule scoring. Explainable baseline ships; learned term is a stub (0.0).

final = sigmoid(a * baseline + c); a/c live here until calibrated on real runs.
Returns per-node {id, baseline, learned, final, evidence[]}.
"""

import math
from datetime import timezone

from graph.build import parse_ts

WINDOW_MIN = 5.0
A, C = 4.0, -1.5


def _sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))


def score_nodes(subgraph, events, t0_str, weights, at_time_str):
    t0 = parse_ts(t0_str)
    now = parse_ts(at_time_str)
    hop = subgraph.get("hop", {})
    first_seen = subgraph.get("first_seen", {})

    out_5m, in_5m, out_dsts, shared_links = {}, {}, {}, {}
    in_amt, out_amt = {}, {}
    for e in subgraph.get("edges", []):
        ets = parse_ts(e["ts"])
        dt_min = (now - ets).total_seconds() / 60.0
        if dt_min < 0:
            continue  # from the future relative to forecast time: ignore
        s, d = e["src"], e["dst"]
        if e["type"] == "transfer":
            in_amt[d] = in_amt.get(d, 0) + (e.get("amount") or 0)
            out_amt[s] = out_amt.get(s, 0) + (e.get("amount") or 0)
            if dt_min <= WINDOW_MIN:
                out_5m[s] = out_5m.get(s, 0) + 1
                in_5m[d] = in_5m.get(d, 0) + 1
            out_dsts.setdefault(s, set()).add(d)
        elif e["type"] == "shared_attribute":
            shared_links[s] = shared_links.get(s, 0) + 1
            shared_links[d] = shared_links.get(d, 0) + 1

    scored = []
    for node in subgraph.get("nodes", []):
        nid = node["id"]
        feats = {
            "fan_out_vel": min(1.0, out_5m.get(nid, 0) / 3.0),
            "fan_in_vel": min(1.0, in_5m.get(nid, 0) / 3.0),
            "is_new": 0.0 if (first_seen.get(nid) is None or parse_ts(first_seen[nid]) <= t0) and nid in (list(hop)[:1] or []) else (
                1.0 if first_seen.get(nid) and parse_ts(first_seen[nid]) > t0 else 0.0),
            "hop_depth": min(1.0, hop.get(nid, 0) / 3.0),
            "split_ratio": min(1.0, len(out_dsts.get(nid, set())) / 2.0),
            "terminal_conv": min(1.0, shared_links.get(nid, 0) / 2.0),
        }
        baseline = sum(weights.get(k, 0.0) * v for k, v in feats.items())
        learned = 0.0  # contrastive embedding stub (roadmap)
        final = _sigmoid(A * (weights and baseline or baseline) + C)

        evidence = []
        if out_5m.get(nid):
            evidence.append(f"fan-out {out_5m[nid]} in {int(WINDOW_MIN)} min")
        if in_5m.get(nid):
            evidence.append(f"fan-in {in_5m[nid]} in {int(WINDOW_MIN)} min")
        if feats["is_new"]:
            evidence.append(f"first seen {first_seen.get(nid)} (after complaint)")
        if len(out_dsts.get(nid, set())) > 1:
            evidence.append(f"split to {len(out_dsts[nid])} accounts")
        if shared_links.get(nid):
            evidence.append(f"{shared_links[nid]} shared-attribute link(s)")
        if hop.get(nid, 0) >= 2:
            evidence.append(f"hop depth {hop[nid]} from complaint")
        scored.append({"id": nid, "baseline": round(baseline, 3), "learned": learned,
                       "final": round(final, 3), "evidence": evidence})
    scored.sort(key=lambda r: r["final"], reverse=True)
    return scored
