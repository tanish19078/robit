"""Fetch real ATM/bank coordinates from OpenStreetMap Overpass API.

Stdlib + h3 only. Run:  python fetch_osm_terminals.py [--bbox S,W,N,E] [--out terminals_osm_delhi.json]
Default bbox: central Delhi (Connaught Place + Karol Bagh + Paharganj).
Output schema matches data/terminals.json. Tagged SIMULATION-safe: public OSM data (ODbL).
"""

import argparse
import json
import os
import urllib.parse
import urllib.request

import h3

HERE = os.path.dirname(os.path.abspath(__file__))
OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def query(bbox):
    s, w, n, e = bbox
    q = (f"[out:json][timeout:90];"
         f"(node['amenity'='atm']({s},{w},{n},{e});"
         f"node['amenity'='bank']({s},{w},{n},{e}););out 300;")
    body = urllib.parse.urlencode({"data": q}).encode()
    headers = {"content-type": "application/x-www-form-urlencoded",
               "User-Agent": "PRAHARI-SIH2026-student-demo/0.1 (contact: sih-team)"}
    last = None
    for mirror in OVERPASS_MIRRORS:
        try:
            req = urllib.request.Request(mirror, data=body, headers=headers)
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except Exception as ex:  # try next mirror
            last = ex
    raise RuntimeError(f"all overpass mirrors failed: {last}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bbox", default="28.600,77.190,28.660,77.245")
    ap.add_argument("--out", default="terminals_osm_delhi.json")
    ap.add_argument("--res", type=int, default=8)
    args = ap.parse_args()

    bbox = [float(x) for x in args.bbox.split(",")]
    data = query(bbox)
    terminals = []
    seen = set()
    for el in data.get("elements", []):
        lat, lon = el.get("lat"), el.get("lon")
        if lat is None or lon is None:
            continue
        key = (round(lat, 5), round(lon, 5))
        if key in seen:
            continue
        seen.add(key)
        tags = el.get("tags", {})
        kind = "ATM" if tags.get("amenity") == "atm" else "POS"
        name = (tags.get("operator") or tags.get("brand") or tags.get("name") or "UNKNOWN").upper()[:12]
        cell = h3.latlng_to_cell(lat, lon, args.res)
        terminals.append({"terminal_id": f"OSM_{el.get('id')}", "type": kind,
                          "lat": round(lat, 6), "lon": round(lon, 6),
                          "h3_r8": cell, "bank": name})
    out = os.path.join(HERE, args.out)
    with open(out, "w") as f:
        json.dump(terminals, f)
    cells = len({t["h3_r8"] for t in terminals})
    print(f"wrote {out}: {len(terminals)} terminals in {cells} H3-{args.res} cells (ODbL, OSM contributors)")


if __name__ == "__main__":
    main()
