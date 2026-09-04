"""M3: explainable baseline + IsolationForest peer rank. final = sigmoid(A*base + B*learned + C)."""

import math

from graph.build import parse_ts

try:
    from mule.anomaly import rank as anomaly_rank
except ImportError:  # pragma: no cover - package layout fallback
    from anomaly import rank as anomaly_rank

WINDOW_MIN = 5.0
A, B, C = 3.0, 2.0, -1.5


def _sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))


def node_features(subgraph, events, t0_str, at_time_str):
    """(order, feat_rows, roots, aux) shared by the scorer and the federated demo."""
    t0 = parse_ts(t0_str)
    now = parse_ts(at_time_str)
    hop = subgraph.get("hop", {})
    first_seen = subgraph.get("first_seen", {})

    out_5m, in_5m, out_dsts, shared_links = {}, {}, {}, {}
    for e in subgraph.get("edges", []):
        ets = parse_ts(e["ts"])
        dt_min = (now - ets).total_seconds() / 60.0
        if dt_min < 0:
            continue  # from the future relative to forecast time: ignore
        s, d = e["src"], e["dst"]
        if e["type"] == "transfer":
            if dt_min <= WINDOW_MIN:
                out_5m[s] = out_5m.get(s, 0) + 1
                in_5m[d] = in_5m.get(d, 0) + 1
            out_dsts.setdefault(s, set()).add(d)
        elif e["type"] == "shared_attribute":
            shared_links[s] = shared_links.get(s, 0) + 1
            shared_links[d] = shared_links.get(d, 0) + 1

    roots = set(list(hop)[:1])
    feat_rows, order = [], []
    for node in subgraph.get("nodes", []):
        nid = node["id"]
        fs = first_seen.get(nid)
        feats = {
            "fan_out_vel": min(1.0, out_5m.get(nid, 0) / 3.0),
            "fan_in_vel": min(1.0, in_5m.get(nid, 0) / 3.0),
            "is_new": 1.0 if (fs and parse_ts(fs) > t0 and nid not in roots) else 0.0,
            "hop_depth": min(1.0, hop.get(nid, 0) / 3.0),
            "split_ratio": min(1.0, len(out_dsts.get(nid, set())) / 2.0),
            "terminal_conv": min(1.0, shared_links.get(nid, 0) / 2.0),
        }
        feat_rows.append(feats)
        order.append(nid)
    aux = {"out_5m": out_5m, "in_5m": in_5m, "out_dsts": out_dsts,
           "shared_links": shared_links, "hop": hop, "first_seen": first_seen}
    return order, feat_rows, roots, aux


def score_nodes(subgraph, events, t0_str, weights, at_time_str):
    order, feat_rows, roots, aux = node_features(subgraph, events, t0_str, at_time_str)
    out_5m, in_5m, out_dsts = aux["out_5m"], aux["in_5m"], aux["out_dsts"]
    shared_links, hop, first_seen = aux["shared_links"], aux["hop"], aux["first_seen"]

    learned_all = [0.0] * len(order)
    pool_idx = [i for i, nid in enumerate(order) if nid not in roots]
    if pool_idx:
        ranked = anomaly_rank([feat_rows[i] for i in pool_idx])
        for i, r in zip(pool_idx, ranked):
            learned_all[i] = r

    scored = []
    for nid, feats, learned in zip(order, feat_rows, learned_all):
        baseline = sum(weights.get(k, 0.0) * v for k, v in feats.items())
        final = _sigmoid(A * baseline + B * learned + C)

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
        scored.append({"id": nid, "baseline": round(baseline, 3), "learned": round(learned, 3),
                       "final": round(final, 3), "evidence": evidence})
    scored.sort(key=lambda r: r["final"], reverse=True)
    return scored
