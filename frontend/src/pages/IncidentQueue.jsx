import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post } from '../api';
import { inr, hhmm } from '../utils';
import TierBadge from '../components/ui/TierBadge';
import { Button } from '../components/ui/primitives';
import { useToast } from '../components/Toast';

const TIERS = ['All', 'Critical', 'Red', 'Amber', 'Green'];

export default function IncidentQueue() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();

  const load = useCallback(
    () =>
      get('/api/incidents')
        .then((result) => setIncidents(result.incidents || []))
        .catch((error) => toast(`Could not load incidents: ${error.message}`))
        .finally(() => setLoading(false)),
    [toast],
  );
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      const result = await post('/api/demo/seed');
      toast(
        result.summary?.failed
          ? `${result.summary.ok} loaded, ${result.summary.failed} failed`
          : `Loaded ${result.summary?.ok ?? result.seeded?.length ?? 0} scenarios`,
      );
      await load();
    } catch (error) {
      toast(`Could not load scenarios: ${error.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const filtered = useMemo(
    () =>
      incidents.filter((item) => {
        const matchesTier = filter === 'All' || item.last_tier === filter;
        const text = `${item.incident_id} ${item.channel || ''}`.toLowerCase();
        return matchesTier && text.includes(query.toLowerCase().trim());
      }),
    [incidents, filter, query],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">CASE REGISTER</p>
          <h1 className="page-title">Incident queue</h1>
          <p className="page-sub">{incidents.length} complaints · refreshes every five seconds</p>
        </div>
        <div className="row">
          <Button variant="ghost" onClick={load}>
            ↻ Refresh
          </Button>
          <Button variant="primary" onClick={seed} disabled={seeding}>
            {seeding ? 'Loading…' : 'Load demo scenarios'}
          </Button>
        </div>
      </div>
      <section className="queue-toolbar" aria-label="Filter incidents">
        <fieldset className="chip-row tier-filter">
          <legend className="sr-only">Filter by risk tier</legend>
          {TIERS.map((tier) => (
            <Button
              key={tier}
              size="sm"
              variant={filter === tier ? 'primary' : 'ghost'}
              pressed={filter === tier}
              onClick={() => setFilter(tier)}
            >
              {tier}
            </Button>
          ))}
        </fieldset>
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Search incidents</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search incident or channel"
          />
        </label>
      </section>
      {loading ? (
        <div className="empty" role="status">
          Loading incidents…
        </div>
      ) : incidents.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon" aria-hidden="true">
            ⌁
          </div>
          <h2>No incidents yet</h2>
          <p className="muted">
            Load the simulated scenarios to explore the investigation workflow.
          </p>
          <Button variant="primary" onClick={seed} disabled={seeding}>
            {seeding ? 'Loading…' : 'Load demo scenarios'}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty">No incidents match those filters.</div>
      ) : (
        <div className="card card-pad-0 table-shell">
          <div className="table-wrap">
            <table className="table table-cards">
              <caption className="sr-only">
                Incident queue with risk, value, channel, filing time and event count
              </caption>
              <thead>
                <tr>
                  <th scope="col">Priority</th>
                  <th scope="col">Incident</th>
                  <th scope="col">Reported amount</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Filed</th>
                  <th scope="col">Events</th>
                  <th scope="col">
                    <span className="sr-only">Open case</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.incident_id} className="queue-row">
                    <td data-label="Priority">
                      <TierBadge tier={item.last_tier} />
                    </td>
                    <td data-label="Incident">
                      <Link
                        className="incident-link"
                        to={`/incidents/${encodeURIComponent(item.incident_id)}`}
                      >
                        {item.incident_id}
                      </Link>
                    </td>
                    <td data-label="Reported amount" className="table-num">
                      {inr(item.amount)}
                    </td>
                    <td data-label="Channel">{item.channel || '—'}</td>
                    <td data-label="Filed" className="nums">
                      {hhmm(item.t0)}
                    </td>
                    <td data-label="Events" className="nums">
                      {item.n_events}
                    </td>
                    <td data-label="Case">
                      <Link
                        className="btn btn-ghost btn-sm"
                        to={`/incidents/${encodeURIComponent(item.incident_id)}`}
                        aria-label={`Open ${item.incident_id}`}
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="queue-footer">
            <span className="muted">
              Showing {filtered.length} of {incidents.length}
            </span>
            <span className="muted">Select “Review” to open the case file</span>
          </div>
        </div>
      )}
    </div>
  );
}
