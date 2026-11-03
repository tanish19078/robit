import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get } from '../api';
import { inr, hhmm } from '../utils';
import TierBadge from '../components/ui/TierBadge';
import { Button, Card, LoadingCard } from '../components/ui/primitives';
import MoneyGraph from '../components/MoneyGraph';
import ExcitationChart from '../components/ExcitationChart';
import MuleTable from '../components/MuleTable';
import EventFlow from '../components/EventFlow';
import WhyVerdict from '../components/WhyVerdict';
import ReviewPanel from '../components/ReviewPanel';
import LiveFeed from '../components/LiveFeed';

const CashoutMap = lazy(() => import('../components/CashoutMap'));
const SECTIONS = [
  ['decision', 'Decision'],
  ['explanation', 'Why'],
  ['trail', 'Money trail'],
  ['forecast', 'Forecast'],
  ['network', 'Accounts'],
  ['review', 'Review'],
];

export default function IncidentDetail() {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      get(`/api/incidents/${encodeURIComponent(id)}/forecast`),
      get(`/api/incidents/${encodeURIComponent(id)}/graph`).catch(() => null),
    ])
      .then(([nextAlert, nextGraph]) => {
        setAlert(nextAlert);
        setGraph(nextGraph);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (loading && !alert)
    return (
      <div className="page">
        <LoadingCard title="Building investigation" lines={5} />
      </div>
    );
  if (error && !alert)
    return (
      <div className="page">
        <Card title="Forecast unavailable">
          <p role="alert" className="error-copy">
            {error}
          </p>
          <Button variant="primary" onClick={load}>
            Retry
          </Button>{' '}
          <Link to="/incidents">Back to queue</Link>
        </Card>
      </div>
    );

  const cells = alert?.probable_cashout_cells || [];
  const window = alert?.cashout_window_minutes || {};
  const muleScores = Object.fromEntries((alert?.mule || []).map((node) => [node.id, node.final]));
  const transfers = (graph?.edges || []).filter((edge) => edge.type === 'transfer');
  const first = transfers.reduce(
    (earliest, event) => (!earliest || event.ts < earliest.ts ? event : earliest),
    null,
  );
  const story = first
    ? `${inr(first.amount)} first moved at ${hhmm(first.ts)} through ${new Set(transfers.map((event) => event.dst)).size} receiving accounts. The current forecast places the highest likelihood at ${cells[0]?.h3_cell || 'an unranked cell'}.`
    : 'The transaction trail is still being assembled.';

  return (
    <div className="page investigation-page">
      <div className="case-topline">
        <Link to="/incidents" className="back-link">
          ← Incident queue
        </Link>
        <span className="case-id">
          CASE <strong>{id}</strong>
        </span>
        <Button variant="ghost" size="sm" onClick={load}>
          ↻ Refresh
        </Button>
      </div>
      <div className="detail">
        <aside className="detail-rail" aria-label="Case navigation">
          <Card title="Case file">
            <dl className="kv">
              <dt>Incident</dt>
              <dd className="mono">{id}</dd>
              <dt>Model</dt>
              <dd>{alert.model_version}</dd>
              <dt>Events</dt>
              <dd>{graph?.edges?.length ?? alert.event_version ?? '—'}</dd>
              <dt>Complaint clock</dt>
              <dd>T+{alert.complaint_clock_min} min</dd>
            </dl>
          </Card>
          <nav className="card section-nav" aria-label="Investigation sections">
            <h2 className="card-title">Jump to</h2>
            {SECTIONS.map(([anchor, label]) => (
              <a key={anchor} href={`#${anchor}`}>
                {label}
              </a>
            ))}
          </nav>
          <Card title="Analyst note" note="Decision support only">
            <p className="muted">
              Review source events and local context before taking any action outside this
              simulation.
            </p>
          </Card>
        </aside>

        <div className="investigation-content">
          <section
            className={`decision-banner decision-${(alert.risk_tier || 'unknown').toLowerCase()}`}
            id="decision"
          >
            <div className="decision-main">
              <p className="eyebrow">CURRENT ASSESSMENT · SIMULATION</p>
              <TierBadge tier={alert.risk_tier} size="lg" />
              <h1>
                {alert.risk_tier === 'Critical'
                  ? 'Withdrawal activity recorded'
                  : alert.risk_tier === 'Red'
                    ? 'Immediate analyst review recommended'
                    : alert.risk_tier === 'Amber'
                      ? 'Review this transaction pattern'
                      : 'Continue monitoring this case'}
              </h1>
              <p>{story}</p>
            </div>
            <div className="countdown-card">
              <span className="stat-label">Cash-out window</span>
              <strong className="countdown-value">
                {window.median ?? '—'}
                <small>min</small>
              </strong>
              <span className="muted">
                {window.q10 ?? '—'}–{window.q90 ?? '—'} min likely range
              </span>
              <span className="countdown-note">Model estimate · not a deadline</span>
            </div>
            <div className="decision-meta">
              <span>Pipeline {alert.alert_latency_ms ?? '—'} ms</span>
              <span>Excitation S={alert.intensity ?? '—'}</span>
              <span>Human approval required</span>
            </div>
          </section>

          <nav className="section-pills" aria-label="Investigation sections">
            {SECTIONS.map(([anchor, label]) => (
              <a key={anchor} href={`#${anchor}`}>
                {label}
              </a>
            ))}
          </nav>

          <section id="explanation" className="section">
            <Card
              title="Why this assessment"
              note="Each tier follows the forecast thresholds and review rules"
            >
              <WhyVerdict alert={alert} />
            </Card>
          </section>

          <section id="trail" className="section">
            <div className="grid grid-2">
              <Card title="Money trail" note="Accounts are arranged by transfer depth">
                <MoneyGraph graph={graph} muleScores={muleScores} />
              </Card>
              <Card
                title="Events in time order"
                note="Source transactions linked to this complaint"
              >
                <EventFlow edges={graph?.edges || []} />
              </Card>
            </div>
          </section>

          <section id="forecast" className="section">
            <div className="grid grid-2">
              <Card title="Predicted cash-out area" note="Ranked H3 cells and nearby terminals">
                <Suspense fallback={<div className="map map-placeholder">Loading map assets…</div>}>
                  <CashoutMap
                    cells={cells}
                    victimLat={alert.victim_lat}
                    victimLon={alert.victim_lon}
                  />
                </Suspense>
                <ol className="ranked ranked-list">
                  {cells.slice(0, 5).map((cell, index) => (
                    <li
                      key={cell.h3_cell}
                      className={`ranked-row ${index === 0 ? 'ranked-lead' : ''}`}
                    >
                      <span className="ranked-label">
                        {cell.h3_cell}
                        {index === 0 && <span className="ranked-tag">Most likely</span>}
                      </span>
                      <span className="ranked-meta">
                        {Math.round(cell.probability * 100)}% · {cell.nearby_cashout_points}{' '}
                        terminals
                      </span>
                      <span className="ranked-bar">
                        <span
                          className={`meter meter-fill-${index === 0 ? 'lead' : 'rest'}`}
                          style={{
                            width: `${Math.max(4, cell.probability * 100)}%`,
                          }}
                        />
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
              <Card
                title="Transfer burst"
                note="Contribution to excitation score S; dashed lines mark tier thresholds"
              >
                <ExcitationChart
                  breakdown={alert.excitation_breakdown || []}
                  tierDetail={alert.tier_detail || {}}
                />
              </Card>
            </div>
          </section>

          <section id="network" className="section">
            <Card
              title="Accounts to review"
              note="Ranked using explainable activity features and peer anomaly score"
            >
              <div className="table-wrap">
                <MuleTable nodes={alert.mule || []} />
              </div>
              {alert.evidence?.length > 0 && (
                <div className="evidence-block">
                  <h3>Evidence summary</h3>
                  <ul className="divided list-reset">
                    {alert.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </section>

          <section id="review" className="section">
            <div className="grid grid-2">
              <Card title="Analyst review" note="All controls below record simulated decisions">
                <ReviewPanel alert={alert} onAction={load} />
              </Card>
              <Card title="Live activity" note="Updates from the incident event stream">
                <LiveFeed incidentId={id} />
              </Card>
            </div>
          </section>

          <details className="raw-details">
            <summary>Technical payload</summary>
            <pre className="raw-json">{JSON.stringify(alert, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
