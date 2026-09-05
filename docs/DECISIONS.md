# DECISIONS — every call since project start, rated

Ratings are mine, in hindsight. 10 = proved right by tests/demo. Low scores are
kept, not hidden — most of them paid for a later 9.

## Standing rules (user-approved, still in force)

1. **Ponytail full** — ladder enforced on every build until user says stop. (user, 2026-09-05)
2. **Commit maxxing** — small atomic commits, every tranche pushed. (user, ongoing)
3. **Lean over paper architecture** — no Kafka/Flink/graph-DB/HTGT/full-GAttNHP in
   the prototype; each cut documented with a roadmap note. (user, 2026-09-03)
4. **Do not cite arXiv:2008.10365** — cash-logistics paper, wrong problem; find a
   better one before citing any. (user, 2026-09-03)
5. **No live-data claims** — synthetic labelled SIMULATION; real data only via the
   rung ladder in `DATA_STRATEGY.md`. (standing)
6. **Measured numbers only** — RESULTS.md pastes real runs; targets never presented
   as results. (standing)
7. **Human review required** — no autonomous freeze/lien; simulated actions + audit
   row only. (standing)
8. **FP-first demos** — 9-report pack must stay at FP 0.00; any MISS is investigated,
   not hidden. (user, 2026-09-04)

## Decision log (chronological, by commit)

| Commit | Decision | Rating | Note |
|---|---|---|---|
| `bdf7f74` | Skeleton + two long briefs, empty service dirs | 6/10 | Needed start, but 1100 lines of unreviewed docs; heavy design scrapped days later |
| `a75134c` | Polish pass on that same heavy design | 5/10 | Churn — polished what we then retired |
| `5234f04` | Lean 4-module spec (`PRAHARI_Final.md`) + agent rules | 9/10 | Foundation everything since used |
| `39634d0` | Synthetic fixtures + config first, code second | 9/10 | Fixtures became the regression suite |
| `535dfd6` | Graph + mule scorer in stdlib, zero ML deps | 9/10 | Zero-dep call paid off in every later tranche |
| `a11635d` | Hawkes-lite + quantiles + smoke test | 8/10 | Right shape; intensity basis wrong, fixed twice later |
| `a9255c1` | Express gateway, tiers, audit, SSE | 9/10 | Still the skeleton today |
| `5509246` | replay + e2e boot-assert-teardown harness | 10/10 | Caught real bugs 4+ times since |
| `00e1b65` | Terminals feed + Dockerfiles | 7/10 | Feed good; Dockerfiles untestable on this box |
| `ab748cd` | Dashboard v0.1 (plain Leaflet page) | 7/10 | Shipped fast, rewritten twice after |
| `c5a351d` | Delete superseded briefs | 8/10 | One spec to rule them out |
| `2061647` | Fix terminals path; one-off `show_ui.py` printer | 6/10 | Fix good; throwaway script deleted later = waste |
| `98b5e24` | Serve frontend from gateway (same-origin) | 10/10 | Killed the whole CORS class of problems in 6 lines |
| `6e62f38` | `hold_demo.py` one-command stack | 9/10 | Still the entry point |
| `b7b1638` | Real OSM ATM pull (265 pts, 35 cells), swappable source | 9/10 | Exposed the transfer finding below |
| `bf3d595` | Tiers on absolute cell intensity | 7/10 | Right direction, wrong basis — raw λ didn't transfer maps; needed one more iteration |
| `15f3a5f` | File-backed gateway store + incident list | 8/10 | Good; later broke e2e isolation, fixed with temp store |
| `9de7054` | IsolationForest mule ranker, sklearn over torch | 8/10 | First version ranked *victims* top — caught and fixed same run |
| `f8eb238` | SVG graph, switcher, mule table | 7/10 | Stepping stone to the presentable pass |
| `bb32481` | 3-bank FedAvg head demo, honest head-only scope | 8/10 | Label bug (benign nodes as fraud) caught same run |
| `cf9b739` | Federation button, data ladder, outreach letter | 8/10 | Unblocked the real-data conversation |
| `11d1bf0` | Tiers on excitation S (map-independent) | 10/10 | Identical values on both maps; the transfer proof |
| `f415f09` | Cleanup: README v0.2, trim, prune one-offs | 8/10 | Needed; README needed two more syncs after |
| `14ed69e` | Path fixes after user's `docs/` move | 6/10 | Janitorial |
| `dfebd6f` | Burst-weighted S + fusion caps + 9-report pack | 10/10 | FP 0.00; the core demo story |
| `9d4a5f5` | Drop stale gitkeeps, purge pycache | 5/10 | Trivial but correct |
| `0741c33` | Ponytail audit: merge replay+anomaly+css, dedupe, markers | 9/10 | −3 files, +1 root-cause guard |
| `fb90edb` | Presentable shell: queue, cards, feed, toasts | 8/10 | Same 2 files, zero new deps |
| `75f205e` | Latency/last-tier fields (no new services) | 8/10 | 99 ms measured end-to-end |
| `f7c393e` | Route type-stomp bugfix (7.74 vs 9.67 mismatch) | 10/10 | Exact-match proof gateway == in-process |
| `5812c13` | Per-event breakdown + tier trace fields | 9/10 | Explanation lives backend-side |
| `330ad2a` | Why-verdict card, timeline, story line | 9/10 | Verdict explains itself |

## Non-commit decisions (no hash, still binding)

| Decision | Rating | Note |
|---|---|---|
| Reject 2008.10365 as core implementation | 10/10 | User agreed before any code depended on it |
| sklearn over torch/PyG for v0.1 | 9/10 | Real learned ranker, laptop-friendly; GNN stays roadmap |
| Victims excluded from suspicion by construction | 10/10 | Would have been a judge-killer bug |
| Within-incident peer comparison (no cross-incident pool) | 9/10 | Cross-pool made benign nodes look anomalous; simpler + explainable |
| Tiers Green<1.2/Amber/Red>2.0 on S, fusion-capped | 9/10 | Third calibration; fixture-pinned, must recalibrate per deployment |
| `ponytail:` ceiling markers on simplifications | 8/10 | O(n) scan, debounced save — upgrade paths named |
| Leave `ce2x.*` root files untouched | 7/10 | Not ours; still pending user call |
| Keep empty `__init__.py` over namespace packages | 7/10 | Explicit beats clever on edge cases |

## Mistakes fixed (not deleted from history)

1. Tiers on normalized share → quiet incidents scored ~0.5 (caught by e2e Amber).
2. Tiers on raw λ → didn't transfer maps (caught by OSM check).
3. Ranker flagged victims (caught by smoke same run).
4. Gateway rewrote event types by route (caught by cross-checking 7.74 vs 9.67).
5. Stale uvicorn squatted port 8000 across runs (killed by PID hunt).
6. Persistence broke e2e reruns with 409 (fixed: isolated temp store).
7. Single transfers spiked S (fixed: burst-weighting).

## Open (undecided, newest first)

- PaySim/AMLSim loader vs RBI-stat priors — which rung-1 source next.
- React upgrade — only if a judge asks; static pair holds.
- `ce2x.*` placement.
- Better paper to cite (user: will find one).
