export default function WhyVerdict({ alert }) {
  if (!alert) return null;
  const detail = alert.tier_detail || {};
  const tier = alert.risk_tier;
  const mark = (ok) => (
    <span className={`trace-mark ${ok ? 'trace-pass' : 'trace-fail'}`} aria-hidden="true">
      {ok ? '✓' : '×'}
    </span>
  );
  const rows = [
    <li key="excitation">
      {mark((detail.intensity ?? 0) >= (detail.red_cut ?? 2))}
      <span>
        Burst excitation is <strong>S = {detail.intensity ?? '—'}</strong>. Amber begins at{' '}
        {detail.amber_cut ?? '—'}; Red begins at {detail.red_cut ?? '—'}.
      </span>
    </li>,
    <li key="peer">
      {mark(tier === 'Critical' || (detail.max_mule_final ?? 0) >= 0.5)}
      <span>
        {tier === 'Critical'
          ? 'A withdrawal event is recorded, which elevates the case to Critical.'
          : `Top account suspicion is ${detail.max_mule_final ?? '—'}; a score of 0.5 is needed to retain Red.`}
      </span>
    </li>,
  ];
  if (detail.capped_from)
    rows.push(
      <li key="cap">
        <span className="trace-mark trace-warn" aria-hidden="true">
          !
        </span>
        <span>
          The tier stepped down from {detail.capped_from}: the burst was high but the strongest
          account score was below the fusion threshold.
        </span>
      </li>,
    );
  const verdicts = {
    Green: 'Continue monitoring; the current signals remain below escalation thresholds.',
    Amber: 'Analyst review is recommended before escalating to a bank response.',
    Red: `Prioritize review of predicted cell ${alert.probable_cashout_cells?.[0]?.h3_cell || '—'}.`,
    Critical: 'Review the recorded withdrawal event and escalate through established procedures.',
  };
  const max = Math.max(detail.intensity || 0, detail.red_cut || 2, 1) * 1.15;
  const pos = (value) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  return (
    <div>
      <ul className="trace">{rows}</ul>
      <p className="trace-verdict">{verdicts[tier] || 'Review the case details.'}</p>
      <div
        className="scale"
        role="img"
        aria-label={`Excitation score ${detail.intensity ?? 0}. Amber threshold ${detail.amber_cut ?? 0}, red threshold ${detail.red_cut ?? 0}`}
      >
        <span
          className="scale-cut"
          style={{
            left: pos(detail.amber_cut || 0),
            background: 'var(--status-warning)',
          }}
        >
          <span className="scale-cut-label">Amber {detail.amber_cut}</span>
        </span>
        <span
          className="scale-cut"
          style={{
            left: pos(detail.red_cut || 0),
            background: 'var(--status-serious)',
          }}
        >
          <span className="scale-cut-label">Red {detail.red_cut}</span>
        </span>
        <span className="scale-needle" style={{ left: pos(detail.intensity || 0) }} />
      </div>
      <div className="scale-value">Current S = {detail.intensity ?? '—'}</div>
    </div>
  );
}
