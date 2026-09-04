"""M3 learned term (v0.1): IsolationForest over one incident's non-root nodes.

Within-subgraph peer comparison only (no cross-incident pool). Heuristic
stand-in for the roadmap contrastive GNN. sklearn optional -> all zeros.
"""

try:
    from sklearn.ensemble import IsolationForest
except ImportError:
    IsolationForest = None

FEATURES = ["fan_out_vel", "fan_in_vel", "is_new", "hop_depth", "split_ratio", "terminal_conv"]


def _to01(scores):
    lo, hi = min(scores), max(scores)
    if hi - lo < 1e-9:
        return [0.5 for _ in scores]
    # IsolationForest: lower score_samples = more anomalous -> invert
    return [(hi - s) / (hi - lo) for s in scores]


def rank(feat_rows):
    """0..1 anomaly ranks (higher = odder peer). Zeros if sklearn missing or <3 rows."""
    if IsolationForest is None or len(feat_rows) < 3:
        return [0.0 for _ in feat_rows]
    X = [[r.get(k, 0.0) for k in FEATURES] for r in feat_rows]
    model = IsolationForest(n_estimators=50, contamination="auto", random_state=42)
    model.fit(X)
    return _to01(list(model.score_samples(X)))
