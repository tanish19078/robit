import { useState } from "react";
import { post } from "../api";

export default function ReviewPanel({ alert, onAction }) {
  const [result, setResult] = useState(null);
  const [simAction, setSimAction] = useState("step_up");

  if (!alert) return <div className="empty">Select an incident and run a forecast first</div>;

  const doReview = async (action) => {
    try {
      const r = await post(`/api/alerts/${alert.alert_id}/${action}`, {
        by: "analyst", reason: "demo review",
      });
      setResult(`${r.alert_id} → ${r.status}`);
      onAction?.();
    } catch (e) {
      setResult(`Error: ${e.message}`);
    }
  };

  const doSimulate = async () => {
    try {
      const r = await post("/api/actions/simulate", {
        alert_id: alert.alert_id, action: simAction,
      });
      setResult(`${r.simulated_action} (${r.audit_id})`);
      onAction?.();
    } catch (e) {
      setResult(`Error: ${e.message}`);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        A human must approve — no action is taken automatically.
      </p>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => doReview("acknowledge")}>
          Acknowledge
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => doReview("escalate")}>
          Escalate
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => doReview("dismiss")}>
          Dismiss
        </button>
      </div>
      <div className="row">
        <select value={simAction} onChange={(e) => setSimAction(e.target.value)}>
          <option value="step_up">step_up</option>
          <option value="hold_request">hold_request</option>
          <option value="patrol_notify">patrol_notify</option>
        </select>
        <button className="btn btn-danger btn-sm" onClick={doSimulate}>
          Simulate Action
        </button>
      </div>
      {result && (
        <p style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>{result}</p>
      )}
    </div>
  );
}
