"""M4b: time-to-cash-out quantiles. Deterministic fallback head.

Higher excitation -> sooner expected cash-out. Ordering q10<=med<=q90 enforced.
Replaced by a learned quantile head once training data exists.
"""


def predict_window(excitation_s, n_frontier=1):
    median = 35.0 - 5.0 * excitation_s - 1.0 * max(0, n_frontier - 1)
    median = max(5.0, min(120.0, median))
    q10 = max(2.0, median * 0.55)
    q90 = median * 1.65
    out = {"q10": int(round(q10)), "median": int(round(median)), "q90": int(round(q90))}
    assert out["q10"] <= out["median"] <= out["q90"]
    return out
