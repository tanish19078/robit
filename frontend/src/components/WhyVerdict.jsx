export default function WhyVerdict({ alert }) {
  if (!alert) return null;
  const t = alert.tier_detail || {};
  const tier = alert.risk_tier;

  const mark = (ok) => ok
    ? <span className="check-ok">✓</span>
    : <span className="check-fail">✗</span>;

  const rows = [];

  // Excitation check
  rows.push(
    <li key="exc">
      {mark((t.intensity ?? 0) > (t.red_cut ?? 2))}{" "}
      Burst excitation <strong>S = {t.intensity ?? "?"}</strong>{" "}
      vs Red cut {t.red_cut ?? "?"} / Amber {t.amber_cut ?? "?"}
    </li>
  );

  // Critical vs peer check
  if (tier === "Critical") {
    rows.push(
      <li key="crit">
        <span className="check-warn">!</span>{" "}
        Live withdrawal on record — tier forced to Critical
      </li>
    );
  } else {
    rows.push(
      <li key="peer">
        {mark((t.max_mule_final ?? 0) >= 0.5)}{" "}
        Top peer suspicion <strong>{t.max_mule_final ?? "?"}</strong>{" "}
        (≥ 0.5 needed to hold Red)
      </li>
    );
  }

  // Fusion cap
  if (t.capped_from) {
    rows.push(
      <li key="cap">
        <span className="check-warn">!</span>{" "}
        Stepped down from {t.capped_from} — hot burst but cool peer (false-positive brake)
      </li>
    );
  }

  // Verdict sentence
  const verdicts = {
    Green: "Keep watching — nothing here clears the bar.",
    Amber: "Worth an analyst's eyes, not a bank alert yet.",
    Red: `Act now: intervene at cell ${alert.probable_cashout_cells?.[0]?.h3_cell || "—"}.`,
    Critical: "Money is moving out — escalate immediately.",
  };
  rows.push(
    <li key="verdict" style={{ marginTop: 8 }}>
      → <strong>{verdicts[tier] || "—"}</strong>
    </li>
  );

  // Scale bar
  const xmax = Math.max(t.intensity || 0, t.red_cut || 2) * 1.15 || 1;
  const pct = (v) => Math.min(100, (v / xmax) * 100);

  return (
    <div>
      <ul className="why-list">{rows}</ul>
      <div className="scale-bar">
        <div className="scale-cut" style={{ left: `${pct(t.amber_cut || 0)}%` }}>
          <span>amber {t.amber_cut}</span>
        </div>
        <div className="scale-cut" style={{ left: `${pct(t.red_cut || 0)}%` }}>
          <span>red {t.red_cut}</span>
        </div>
        <div className="scale-needle" style={{ left: `${pct(t.intensity || 0)}%` }}
          title={`S=${t.intensity}`} />
      </div>
    </div>
  );
}
