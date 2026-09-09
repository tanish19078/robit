import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { get } from "../api";
import { inr, hhmm, shortId } from "../utils";
import TierBadge from "../components/TierBadge";
import MoneyGraph from "../components/MoneyGraph";
import CashoutMap from "../components/CashoutMap";
import ExcitationChart from "../components/ExcitationChart";
import MuleTable from "../components/MuleTable";
import EventFlow from "../components/EventFlow";
import WhyVerdict from "../components/WhyVerdict";
import ReviewPanel from "../components/ReviewPanel";
import LiveFeed from "../components/LiveFeed";

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
      get(`/api/incidents/${id}/forecast`),
      get(`/api/incidents/${id}/graph`).catch(() => null),
    ])
      .then(([a, g]) => { setAlert(a); setGraph(g); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const muleScores = {};
  if (alert?.mule) for (const n of alert.mule) muleScores[n.id] = n.final;

  // Story generation
  const buildStory = () => {
    if (!alert || !graph?.edges?.length) return null;
    const transfers = graph.edges.filter((e) => e.type === "transfer");
    if (!transfers.length) return null;
    const first = transfers.reduce((m, e) => (e.ts < m.ts ? e : m), transfers[0]);
    const lastTs = transfers.reduce((m, e) => (e.ts > m ? e.ts : m), transfers[0].ts);
    const dsts = new Set(transfers.map((e) => e.dst));
    const span = Math.round((Date.parse(lastTs) - Date.parse(first.ts)) / 60000);
    const top = alert.probable_cashout_cells?.[0];
    return `${inr(first.amount)} left the victim account at ${hhmm(first.ts)}, split across ${dsts.size} account${dsts.size === 1 ? "" : "s"} within ${span} minute${span === 1 ? "" : "s"}. The trail points at a ${top?.nearby_cashout_points || "?"}-terminal cluster — expected cash-out around ${alert.cashout_window_minutes?.median} min after the burst.`;
  };

  if (loading) return <div className="page"><div className="empty">Loading forecast for {id}…</div></div>;
  if (error) return (
    <div className="page">
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "var(--red)", marginBottom: 12 }}>Error: {error}</p>
        <button className="btn btn-primary" onClick={load}>Retry</button>
        <Link to="/incidents" className="btn btn-ghost" style={{ marginLeft: 12 }}>← Back to Queue</Link>
      </div>
    </div>
  );

  const w = alert.cashout_window_minutes || {};
  const cells = alert.probable_cashout_cells || [];
  const pmax = Math.max(...cells.map((c) => c.probability), 0.01);

  return (
    <div className="page">
      <Link to="/incidents" style={{ fontSize: 13, color: "var(--muted)" }}>← Back to Queue</Link>

      <div className="detail-layout" style={{ marginTop: 12 }}>
        {/* Sidebar */}
        <div className="detail-sidebar stack">
          <div className="card">
            <div className="card-title">Case File</div>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div><span style={{ color: "var(--muted)" }}>Incident</span> <strong>{id}</strong></div>
              <div><span style={{ color: "var(--muted)" }}>Money path</span> <strong>{(alert.money_path || []).map(shortId).join(" → ")}</strong></div>
              <div><span style={{ color: "var(--muted)" }}>Model</span> {alert.model_version}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Sections</div>
            <div style={{ fontSize: 13, lineHeight: 2.2 }}>
              <div><a href="#verdict">Verdict</a></div>
              <div><a href="#why">Why This Verdict</a></div>
              <div><a href="#trail">Money Trail</a></div>
              <div><a href="#map">Cash-Out Map</a></div>
              <div><a href="#suspects">Suspect Ranking</a></div>
              <div><a href="#review">Analyst Review</a></div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="stack">
          {/* A — Verdict */}
          <div className="card section" id="verdict">
            <div className="card-title">Verdict</div>
            <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
              <TierBadge tier={alert.risk_tier} large>
                {alert.risk_tier}
              </TierBadge>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {w.q10}/{w.median}/{w.q90} min
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  q10 / median / q90 time-to-cashout window
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              Complaint clock T+{alert.complaint_clock_min}min · pipeline {alert.alert_latency_ms ?? "?"}ms · {alert.model_version}
              {alert.intensity != null && ` · S=${alert.intensity}`}
            </div>
            {buildStory() && (
              <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>{buildStory()}</p>
            )}
          </div>

          {/* B — Why */}
          <div className="card section" id="why">
            <div className="card-title">Why This Verdict — Rule Trace</div>
            <WhyVerdict alert={alert} />
          </div>

          {/* C — Money Trail */}
          <div className="section" id="trail">
            <div className="grid-2">
              <div className="card">
                <div className="card-title">Money Trail — color is mule risk</div>
                <MoneyGraph graph={graph} muleScores={muleScores} />
              </div>
              <div className="card">
                <div className="card-title">What Happened, In Order</div>
                <EventFlow edges={graph?.edges || []} />
              </div>
            </div>
          </div>

          {/* D — Map & Excitation */}
          <div className="section" id="map">
            <div className="grid-2">
              <div className="card">
                <div className="card-title">Cash-Out Map — red cluster is the forecast</div>
                <CashoutMap topCell={cells[0]?.h3_cell} />
              </div>
              <div className="card">
                <div className="card-title">Excitation Breakdown — each transfer's share</div>
                <ExcitationChart breakdown={alert.excitation_breakdown || []} tierDetail={alert.tier_detail || {}} />
              </div>
            </div>
            {/* Ranked cells */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">Ranked H3 Cells</div>
              {cells.map((c, i) => (
                <div key={c.h3_cell} style={{ marginBottom: 6 }}>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ fontWeight: i === 0 ? 700 : 400 }}>{c.h3_cell}</span>
                    <span>p={c.probability} · {c.nearby_cashout_points} terminals</span>
                  </div>
                  <div className="prob-bar">
                    <i className={`prob-bar-fill${i === 0 ? " hot" : ""}`}
                      style={{ width: `${(c.probability / pmax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E — Suspects */}
          <div className="card section" id="suspects">
            <div className="card-title">Suspect Ranking</div>
            <MuleTable nodes={alert.mule || []} />
            <div style={{ marginTop: 16 }}>
              <div className="card-title">Evidence</div>
              {(alert.evidence || []).length ? (
                <ul className="evidence-list">
                  {alert.evidence.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              ) : (
                <div className="empty">No evidence items</div>
              )}
            </div>
          </div>

          {/* F — Review */}
          <div className="card section" id="review">
            <div className="card-title">Analyst Review — a human must approve</div>
            <ReviewPanel alert={alert} onAction={load} />
            <div style={{ marginTop: 20 }}>
              <div className="card-title">Live Activity</div>
              <LiveFeed incidentId={id} />
            </div>
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 12 }}>Raw Alert JSON</summary>
              <pre className="raw-json">{JSON.stringify(alert, null, 2)}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
