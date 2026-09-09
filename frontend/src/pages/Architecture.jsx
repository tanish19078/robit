export default function Architecture() {
  return (
    <div className="page">
      <h1 className="page-title">System Architecture</h1>
      <p className="page-sub">Engineering design of the PRAHARI predictive pipeline</p>

      {/* Pipeline diagram */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">End-to-End Data Flow</div>
        <div className="pipeline">
          <div className="pipeline-step">
            <div className="pipeline-step-title">NCRP / Bank</div>
            <div className="pipeline-step-desc">Complaint & transaction feeds</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-title">Event Gateway</div>
            <div className="pipeline-step-desc">Kafka / Redis stream</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-title">Graph + Features</div>
            <div className="pipeline-step-desc">k-hop subgraph builder</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-title">Mule Scorer</div>
            <div className="pipeline-step-desc">GCPAL / IsolationForest</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-title">Forecaster</div>
            <div className="pipeline-step-desc">GAttNHP / Hawkes-lite</div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-step">
            <div className="pipeline-step-title">Dashboard</div>
            <div className="pipeline-step-desc">Risk API + analyst UI</div>
          </div>
        </div>
      </div>

      {/* Tech stack */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Technology Stack</div>
        <table className="table arch-table">
          <thead>
            <tr><th>Layer</th><th>Technology</th><th>Role</th></tr>
          </thead>
          <tbody>
            <tr><td>Data Streaming</td><td>Apache Kafka / Redis Streams</td><td>Event ingestion and processing</td></tr>
            <tr><td>Graph ML</td><td>PyTorch Geometric (roadmap), IsolationForest (current)</td><td>Mule detection and node embedding</td></tr>
            <tr><td>Forecasting</td><td>Hawkes-lite (current), GAttNHP (roadmap)</td><td>Spatial-temporal cash-out prediction</td></tr>
            <tr><td>Backend API</td><td>Python FastAPI + Node.js Express</td><td>ML inference + API gateway</td></tr>
            <tr><td>Frontend</td><td>React + Leaflet + Vite</td><td>GIS dashboard and alert management</td></tr>
            <tr><td>Database</td><td>JSON file store (current), PostgreSQL (roadmap)</td><td>Incident, audit, and terminal storage</td></tr>
            <tr><td>Spatial Index</td><td>Uber H3 Resolution 8/9</td><td>Hexagonal cell assignment (~200–530m areas)</td></tr>
            <tr><td>Privacy</td><td>FedAvg head-only (current), full DP+SMPC (roadmap)</td><td>Cross-bank collaboration</td></tr>
          </tbody>
        </table>
      </div>

      {/* 4 Modules */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Four-Module Pipeline</div>

        <h3 style={{ fontSize: 15, marginTop: 16, marginBottom: 8 }}>Module 2 — Graph Construction</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
          k-hop BFS traversal from the complaint root. Follows transfer, withdrawal, and shared-attribute edges up to depth 3.
          A greedy max-amount path tracer finds the primary cash-out trail from victim to frontier.
        </p>
        <pre className="code-block">build_khop(events, roots=[victim_hash], depth=3) → nodes, edges, path</pre>

        <h3 style={{ fontSize: 15, marginTop: 24, marginBottom: 8 }}>Module 3 — Mule Detection</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
          6 hand-crafted features (fan_out_vel, fan_in_vel, is_new, hop_depth, split_ratio, terminal_conv)
          plus IsolationForest peer ranking. Victims excluded by construction.
        </p>
        <pre className="code-block">final = σ(3.0 × baseline + 2.0 × learned − 1.5)</pre>

        <h3 style={{ fontSize: 15, marginTop: 24, marginBottom: 8 }}>Module 4a — Hawkes Excitation</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
          Burst-weighted temporal excitation. Each transfer contributes based on recency decay and how many other transfers
          occurred within ±5 minutes (burst peers). The score S is map-independent.
        </p>
        <pre className="code-block">{`S = Σ(amount_norm × e^(−β·Δt) × (1 + burst_peers))
risk(cell) = base_prior + S × proximity × density`}</pre>

        <h3 style={{ fontSize: 15, marginTop: 24, marginBottom: 8 }}>Module 4b — Quantile Window</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
          Deterministic non-crossing quantiles. Higher excitation contracts the window — more urgent = sooner expected cash-out.
        </p>
        <pre className="code-block">{`median = clamp(30 − 2·S − (frontier−1), [5, 120])
q10 = 0.55 × median,  q90 = 1.65 × median
assert q10 ≤ median ≤ q90`}</pre>
      </div>

      {/* Simplified vs Production */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Prototype vs. Production Roadmap</div>
        <table className="table">
          <thead>
            <tr><th>Prototype (current)</th><th>Production (roadmap)</th></tr>
          </thead>
          <tbody>
            <tr><td>Stdlib graph BFS</td><td>PyTorch Geometric / TGN temporal graph</td></tr>
            <tr><td>IsolationForest mule ranker</td><td>GCPAL contrastive pre-training + GNN</td></tr>
            <tr><td>Deterministic Hawkes-lite</td><td>Full GAttNHP neural Hawkes with attention</td></tr>
            <tr><td>Deterministic quantiles</td><td>Learned NCQ regression head</td></tr>
            <tr><td>JSON file store</td><td>PostgreSQL + PostGIS</td></tr>
            <tr><td>SSE live updates</td><td>WebSocket / Kafka event bus</td></tr>
            <tr><td>Static React + Leaflet</td><td>Deck.gl + advanced GIS rendering</td></tr>
            <tr><td>Head-only FedAvg</td><td>Full encoder federation with DP + secure aggregation</td></tr>
            <tr><td>265 OSM ATMs (Delhi)</td><td>National terminal registry</td></tr>
            <tr><td>9 synthetic fixtures</td><td>AMLSim / real anonymized data</td></tr>
          </tbody>
        </table>
      </div>

      {/* Safeguards */}
      <div className="card">
        <div className="card-title">Safeguards</div>
        <ul className="evidence-list" style={{ fontSize: 14 }}>
          <li><span className="check-ok">✓</span> All account identifiers are cryptographically hashed — no PII in the pipeline</li>
          <li><span className="check-ok">✓</span> Every output is tagged <strong>SIMULATION</strong> — no live banking rail connected</li>
          <li><span className="check-ok">✓</span> Human approval required — no autonomous freeze or lien action</li>
          <li><span className="check-ok">✓</span> Financial actions are simulated and audited — step_up, hold_request, patrol_notify</li>
          <li><span className="check-ok">✓</span> Every alert carries model version, evidence payload, and immutable audit trail</li>
          <li><span className="check-ok">✓</span> Federated learning shares only aggregated statistics — raw_tables_shared = false</li>
        </ul>
      </div>
    </div>
  );
}
