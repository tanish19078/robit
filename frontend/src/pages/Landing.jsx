import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../api";
import StatCard from "../components/StatCard";
import { useToast } from "../components/Toast";

export default function Landing() {
  const [metrics, setMetrics] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    get("/api/metrics").then(setMetrics).catch(() => {});
  }, []);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const r = await post("/api/demo/seed");
      const ok = r.seeded.filter((s) => !s.error).length;
      toast(`Seeded ${ok} complaints`);
      get("/api/metrics").then(setMetrics).catch(() => {});
    } catch (e) {
      toast(`Error: ${e.message}`);
    }
    setSeeding(false);
  };

  return (
    <div className="page">
      {/* Hero */}
      <div className="hero">
        <div className="hero-title">PRAHARI</div>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
          Predictive Intelligence Engine for Cyber-Fraud Cash-Out Interception
        </p>
        <span className="sim-badge" style={{ marginTop: 8, display: "inline-block" }}>
          SIMULATION — SIH 2026 · PS 26184
        </span>
        <div className="hero-pitch">
          PRAHARI starts a clock at the moment a complaint is filed, traces the
          live money path, and turns it into an explainable prediction of{" "}
          <strong>where</strong> the cash-out is likely,{" "}
          <strong>when</strong> it is likely, and{" "}
          <strong>why</strong> the team should act now.
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 32 }}>
        <StatCard
          value={metrics?.incidents ?? "—"}
          label="Total Incidents"
        />
        <StatCard
          value={metrics?.events ?? "—"}
          label="Total Events"
        />
        <StatCard
          value={metrics?.avg_latency_ms != null ? `${metrics.avg_latency_ms}ms` : "—"}
          label="Avg Pipeline Latency"
        />
      </div>

      {/* Pipeline */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">How It Works — 4 Modules, One Loop</div>
        <div className="pipeline">
          <div className="pipeline-step">
            <div className="pipeline-step-num">1</div>
            <div className="pipeline-step-title">Complaint Intake</div>
            <div className="pipeline-step-desc">
              NCRP / 1930 complaint triggers the clock at t₀
            </div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-num">2</div>
            <div className="pipeline-step-title">Graph Tracing</div>
            <div className="pipeline-step-desc">
              k-hop subgraph of money movement across accounts
            </div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-num">3</div>
            <div className="pipeline-step-title">Mule Detection</div>
            <div className="pipeline-step-desc">
              IsolationForest + explainable baseline scoring
            </div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-num">4</div>
            <div className="pipeline-step-title">Cash-Out Forecast</div>
            <div className="pipeline-step-desc">
              Hawkes excitation over H3 spatial cells + time window
            </div>
          </div>
        </div>
      </div>

      {/* Golden Hour */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-title">The Golden Hour Deficit</div>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Fraudsters route stolen funds through <strong>3–5 layers</strong> of
          mule accounts within approximately <strong>30 minutes</strong>.
          Physical cash withdrawal makes recovery extremely difficult or
          impossible. PRAHARI aims to predict the withdrawal location and time
          window <strong>before</strong> it happens — shifting the response from
          post-withdrawal investigation to <strong>pre-withdrawal prevention</strong>.
        </p>
      </div>

      {/* CTAs */}
      <div className="row" style={{ justifyContent: "center", gap: 16 }}>
        <button className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}
          onClick={() => navigate("/incidents")}>
          Enter Command Center →
        </button>
        <button className="btn btn-ghost" onClick={seedDemo} disabled={seeding}>
          {seeding ? "Loading…" : "Load Demo Data"}
        </button>
      </div>
    </div>
  );
}
