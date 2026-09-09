import { useState, useEffect } from "react";
import { get } from "../api";
import StatCard from "../components/StatCard";

export default function FederationDemo() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    get("/api/federated/demo")
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Privacy-Preserving Federation</h1>
      <p className="page-sub">How banks collaborate without sharing raw data</p>

      {/* Explainer */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Design Principle</div>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Federated Learning allows multiple financial institutions to improve a
          shared fraud-detection model <strong>without exposing raw customer
          ledgers</strong>. Each bank computes local statistics and shares only
          aggregated, privacy-preserving updates. The coordinator never sees
          individual transactions, account hashes, or event sequences.
        </p>
      </div>

      {/* Pipeline */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">How It Works</div>
        <div className="pipeline">
          <div className="pipeline-step">
            <div className="pipeline-step-num">1</div>
            <div className="pipeline-step-title">Local Training</div>
            <div className="pipeline-step-desc">
              Each bank trains on its own records — raw events never leave
            </div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-num">2</div>
            <div className="pipeline-step-title">Protected Updates</div>
            <div className="pipeline-step-desc">
              Only class means and counts are shared — never raw events
            </div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-num">3</div>
            <div className="pipeline-step-title">Shared Model</div>
            <div className="pipeline-step-desc">
              Coordinator aggregates into a shared scoring head
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty">Running federation demo…</div>
      ) : error ? (
        <div className="card" style={{ textAlign: "center", padding: 30 }}>
          <p style={{ color: "var(--red)" }}>Error: {error}</p>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
            Make sure the ML service is running on port 8000
          </p>
        </div>
      ) : (
        <>
          {/* Bank cards */}
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {Object.entries(data.clients || {}).map(([bank, info]) => (
              <div className="card" key={bank}>
                <div className="card-title">{bank}</div>
                <div className="grid-3" style={{ textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{info.n_nodes}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>NODES</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--red)" }}>{info.n_fraud}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>FRAUD</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{info.n_benign}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>BENIGN</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Result */}
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="card-title">Cosine Similarity</div>
              <StatCard
                value={data.cosine_similarity}
                label="Federated vs Centralized"
              />
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>
                <span className="check-ok">✓</span>{" "}
                Raw tables shared: <strong>{String(data.raw_tables_shared)}</strong>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Weight Comparison</div>
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Federated</th>
                    <th>Centralized</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.features || []).map((f, i) => (
                    <tr key={f} style={{ cursor: "default" }}>
                      <td>{f}</td>
                      <td>{data.federated_weights?.[i]}</td>
                      <td>{data.centralized_weights?.[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scope */}
          <div className="card">
            <div className="card-title">Scope</div>
            <p style={{ color: "var(--muted)", fontSize: 13 }}>{data.scope}</p>
          </div>
        </>
      )}
    </div>
  );
}
