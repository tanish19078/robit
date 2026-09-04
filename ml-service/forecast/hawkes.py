"""M4a: Hawkes-lite cell scoring. Stdlib only.

risk(c,t) = base_prior(c) + S(t) * proximity(c) * density(c), S = recency-decayed
transfer excitation. Tiers use S (map-independent); cells use the distribution.
"""

import math

from graph.build import parse_ts


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def cell_table(terminals):
    """Terminals -> {cell: centroid lat/lon, count, terminal_ids}."""
    cells = {}
    for t in terminals:
        c = cells.setdefault(t["h3_r8"], {"lat": 0.0, "lon": 0.0, "count": 0,
                                           "terminal_ids": [], "n": 0})
        c["lat"] += t["lat"]
        c["lon"] += t["lon"]
        c["count"] += 1
        c["n"] += 1
        c["terminal_ids"].append(t["terminal_id"])
    for c in cells.values():
        c["lat"] /= c["n"]
        c["lon"] /= c["n"]
    return cells


def excitation(events, at_time_str, beta_per_min, ref_amount=50000.0):
    now = parse_ts(at_time_str)
    total = 0.0
    for e in events:
        if e.get("type") != "transfer":
            continue
        dt = (now - parse_ts(e["ts"])).total_seconds() / 60.0
        if dt < 0:
            continue
        amt = min(1.0, (e.get("amount") or 0) / ref_amount)
        total += amt * math.exp(-beta_per_min * dt)
    return total


def score_cells(events, terminals, victim_lat, victim_lon, at_time_str,
                sigma_km=1.5, beta_per_min=0.12):
    cells = cell_table(terminals)
    s = excitation(events, at_time_str, beta_per_min)
    max_count = max((c["count"] for c in cells.values()), default=1)

    raws = {}
    for cell, c in cells.items():
        base = 0.05 + 0.01 * c["count"]
        dist = haversine_km(victim_lat, victim_lon, c["lat"], c["lon"])
        proximity = math.exp(-(dist ** 2) / (2 * sigma_km ** 2))
        density = 0.5 + 0.5 * (c["count"] / max_count)
        raws[cell] = base + s * proximity * density

    total = sum(raws.values()) or 1.0
    ranked = [{"h3_cell": cell,
               "probability": round(raw / total, 3),
               "nearby_cashout_points": cells[cell]["count"],
               "raw": round(raw, 3)}
              for cell, raw in sorted(raws.items(), key=lambda kv: kv[1], reverse=True)]
    return ranked, round(s, 3)
