import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post } from '../api';
import { Button } from '../components/ui/primitives';
import TierBadge from '../components/ui/TierBadge';
import { useToast } from '../components/Toast';

const FLOW = [
  ['01', 'Complaint received', 'Anchor the response clock at t₀.'],
  ['02', 'Trace the money', 'Follow transfers and linked accounts.'],
  ['03', 'Rank the network', 'Explain suspicious behavior with evidence.'],
  ['04', 'Forecast cash-out', 'Prioritize likely cells and a time window.'],
];

export default function Landing() {
  const [metrics, setMetrics] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();

  const refresh = useCallback(
    () =>
      Promise.all([get('/api/metrics'), get('/api/incidents')])
        .then(([m, q]) => {
          setMetrics(m);
          setIncidents(q.incidents || []);
        })
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const result = await post('/api/demo/seed');
      toast(
        result.summary?.failed
          ? `${result.summary.ok} loaded, ${result.summary.failed} failed`
          : `Loaded ${result.summary?.ok ?? result.seeded?.length ?? 0} scenarios`,
      );
      await refresh();
    } catch (error) {
      toast(`Could not load demo data: ${error.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const urgent = incidents
    .filter((item) => ['Critical', 'Red'].includes(item.last_tier))
    .slice(0, 4);

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">FINANCIAL FRAUD RESPONSE · DEMONSTRATION SYSTEM</p>
          <h1>
            See the cash-out
            <br />
            <span>before it happens.</span>
          </h1>
          <p className="hero-description">
            PRAHARI turns a reported transaction into an explainable money trail, a likely
            withdrawal location, and a time window for analyst review.
          </p>
          <div className="row hero-actions">
            <Link className="btn btn-primary btn-lg" to="/incidents">
              Open incident queue <span aria-hidden="true">→</span>
            </Link>
            <Button variant="ghost" size="lg" onClick={seedDemo} disabled={seeding}>
              {seeding ? 'Loading scenarios…' : 'Load demo scenarios'}
            </Button>
          </div>
          <p className="simulation-note">
            <span aria-hidden="true">●</span> Simulation only · No live banking connection · Every
            intervention requires human review
          </p>
        </div>
        <section className="card hero-status-card" aria-label="Operational picture">
          <header className="card-head">
            <div>
              <h2 className="card-title">Operational picture</h2>
              <p className="card-note">Current gateway snapshot</p>
            </div>
            <span className="live-indicator">● Live</span>
          </header>
          <div className="hero-stat">
            <span className="hero-value">{metrics?.incidents ?? '—'}</span>
            <span className="muted">tracked incidents</span>
          </div>
          <div className="hero-stat">
            <span className="hero-value">{metrics?.events ?? '—'}</span>
            <span className="muted">linked events</span>
          </div>
          <section className="status-summary" aria-label="Incident tiers">
            {[
              ['Critical', metrics?.alerts_by_tier?.Critical],
              ['Red', metrics?.alerts_by_tier?.Red],
              ['Amber', metrics?.alerts_by_tier?.Amber],
              ['Green', metrics?.alerts_by_tier?.Green],
            ].map(([tier, count]) => (
              <div key={tier}>
                <TierBadge tier={tier} />
                <strong>{count ?? 0}</strong>
              </div>
            ))}
          </section>
          <p className="card-note">
            Average pipeline:{' '}
            {metrics?.avg_latency_ms == null ? '—' : `${metrics.avg_latency_ms} ms`}
          </p>
        </section>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A FOUR-STEP RESPONSE LOOP</p>
            <h2>From complaint to actionable lead</h2>
          </div>
          <Link to="/architecture">Explore the architecture →</Link>
        </div>
        <div className="grid grid-4 process-grid">
          {FLOW.map(([number, title, detail]) => (
            <article key={number} className="card process-card">
              <span className="process-number">{number}</span>
              <h3>{title}</h3>
              <p className="muted">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block home-lower">
        <section className="card">
          <header className="card-head">
            <div>
              <h2 className="card-title">Priority incidents</h2>
              <p className="card-note">Open a case to review its evidence and forecast</p>
            </div>
            <Link to="/incidents">View all →</Link>
          </header>
          {urgent.length ? (
            <ul className="priority-list list-reset">
              {urgent.map((incident) => (
                <li key={incident.incident_id}>
                  <Link to={`/incidents/${incident.incident_id}`}>
                    <span>
                      <TierBadge tier={incident.last_tier} />
                      <strong>{incident.incident_id}</strong>
                    </span>
                    <span className="muted">{incident.n_events} events →</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty compact-empty">
              No priority incidents yet. Load demo scenarios or open the queue.
            </div>
          )}
        </section>
        <section className="card golden-hour-card">
          <header className="card-head">
            <div>
              <h2 className="card-title">The golden-hour gap</h2>
              <p className="card-note">Why early triage matters</p>
            </div>
          </header>
          <p>
            Fraud proceeds can move through several intermediary accounts before a cash withdrawal.
            PRAHARI brings the transaction path, suspicious activity, and likely cash-out area into
            one reviewable case.
          </p>
          <div className="safeguard">
            <span aria-hidden="true">✓</span>
            <span>
              <strong>Human decision stays central.</strong> The system presents evidence and
              simulated actions; it does not freeze funds or contact a bank.
            </span>
          </div>
        </section>
      </section>
    </div>
  );
}
