import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../api";
import { inr, hhmm } from "../utils";
import { useToast } from "../components/Toast";

const TIERS = ["All", "Green", "Amber", "Red", "Critical"];

export default function IncidentQueue() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(() => {
    get("/api/incidents")
      .then((d) => { setIncidents(d.incidents || []); setLoading(false); })
      .catch((e) => { toast(`Error: ${e.message}`); setLoading(false); });
  }, [toast]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const seedDemo = async () => {
    try {
      const r = await post("/api/demo/seed");
      toast(`Seeded ${r.seeded.filter((s) => !s.error).length} complaints`);
      load();
    } catch (e) {
      toast(`Error: ${e.message}`);
    }
  };

  const filtered = filter === "All"
    ? incidents
    : incidents.filter((i) => i.last_tier === filter);

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 8, justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Complaint Queue</h1>
          <p className="page-sub">{incidents.length} incidents loaded</p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={load}>⟳ Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={seedDemo}>Load Demo Data</button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="row" style={{ marginBottom: 16 }}>
        {TIERS.map((t) => (
          <button key={t}
            className={`btn btn-sm ${filter === t ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(t)}>
            {t === "All" ? "All" : <><span className={`tier-dot ${t}`} style={{ display: "inline-block", marginRight: 6 }} />{t}</>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : !incidents.length ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ marginBottom: 16, fontSize: 15 }}>No complaints yet.</p>
          <button className="btn btn-primary" onClick={seedDemo}>Load Demo Data</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Incident ID</th>
                <th>Amount</th>
                <th>Channel</th>
                <th>Filed</th>
                <th>Events</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.incident_id} onClick={() => navigate(`/incidents/${i.incident_id}`)}>
                  <td><span className={`tier-dot ${i.last_tier || ""}`} /></td>
                  <td style={{ fontWeight: 600 }}>{i.incident_id}</td>
                  <td>{inr(i.amount)}</td>
                  <td>{i.channel || "—"}</td>
                  <td>{hhmm(i.t0)}</td>
                  <td>{i.n_events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
