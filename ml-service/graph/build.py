"""M2: k-hop temporal subgraph around complaint roots. Stdlib only.

Callers must pass events with ts <= at_time (time-order preserved by contract).
"""

from collections import defaultdict, deque
from datetime import datetime, timezone


def parse_ts(ts):
    dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _neighbours(src, adj_out, adj_shared):
    yield from adj_out.get(src, [])
    for other in adj_shared.get(src, set()):
        yield {"dst": other, "via_shared": True}


def build_khop(events, roots, depth=3):
    """Return {nodes, edges, path} for the k-hop subgraph around roots."""
    adj_out = defaultdict(list)
    adj_shared = defaultdict(set)
    edge_list = []
    first_seen = {}

    for e in events:
        etype = e.get("type")
        ts = e.get("ts")
        if etype == "transfer":
            s, d = e.get("src"), e.get("dst")
            adj_out[s].append({"dst": d, "event": e})
            edge_list.append({"src": s, "dst": d, "type": "transfer",
                              "ts": ts, "amount": e.get("amount", 0)})
            for n in (s, d):
                if n not in first_seen:
                    first_seen[n] = ts
        elif etype == "withdrawal":
            s = e.get("src")
            t = e.get("terminal_id", "terminal")
            edge_list.append({"src": s, "dst": t, "type": "withdrawal",
                              "ts": ts, "amount": e.get("amount", 0)})
            if s not in first_seen:
                first_seen[s] = ts
        elif etype == "shared_attribute":
            s, d = e.get("src"), e.get("dst")
            adj_shared[s].add(d)
            adj_shared[d].add(s)
            edge_list.append({"src": s, "dst": d, "type": "shared_attribute",
                              "ts": ts, "amount": 0})
            for n in (s, d):
                if n not in first_seen:
                    first_seen[n] = ts

    for r in roots:
        first_seen.setdefault(r, None)

    hop = {r: 0 for r in roots}
    queue = deque(roots)
    while queue:
        cur = queue.popleft()
        if hop[cur] >= depth:
            continue
        for nb in _neighbours(cur, adj_out, adj_shared):
            nxt = nb["dst"]
            if nxt not in hop:
                hop[nxt] = hop[cur] + 1
                queue.append(nxt)

    in_scope = set(hop)
    nodes = [{"id": n, "hop": hop[n], "first_seen": first_seen.get(n)} for n in hop]
    scoped_edges = [e for e in edge_list if e["src"] in in_scope or e["dst"] in in_scope]

    return {"nodes": nodes, "edges": scoped_edges,
            "path": trace_path(roots, adj_out), "hop": hop,
            "first_seen": first_seen}


def trace_path(roots, adj_out):
    """Greedy max-amount chain from the first root."""
    if not roots:
        return []
    path, cur, seen = [roots[0]], roots[0], {roots[0]}
    while True:
        outs = [o for o in adj_out.get(cur, []) if o["dst"] not in seen]
        if not outs:
            return path
        nxt = max(outs, key=lambda o: (o["event"] or {}).get("amount", 0))
        cur = nxt["dst"]
        path.append(cur)
        seen.add(cur)
