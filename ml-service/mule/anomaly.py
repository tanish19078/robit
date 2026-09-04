"""M3 learned term (v0.1): unsupervised anomaly ranking within one incident.

Uses IsolationForest on the 6 baseline features of the incident's own
non-root nodes ("which peer in THIS money path looks odd?").
Deliberately no cross-incident pool: a fraud-dominated history would make
benign nodes look anomalous and vice versa.
This is a heuristic stand-in, NOT the contrastive GNN from the roadmap:
it cannot learn cross-view structural similarity, only feature outlierness.
sklearn is optional: missing import -> learned=0.0 (baseline-only mode).
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
    """feat_rows: list of {feature: value}. Returns list of 0..1 anomaly ranks."""
    if IsolationForest is None or len(feat_rows) < 3:
        return [0.0 for _ in feat_rows]
    X = [[r.get(k, 0.0) for k in FEATURES] for r in feat_rows]
    model = IsolationForest(n_estimators=50, contamination="auto", random_state=42)
    model.fit(X)
    return _to01(list(model.score_samples(X)))
