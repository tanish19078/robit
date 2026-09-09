import { shortId, inr, hhmm } from "../utils";

export default function EventFlow({ edges = [] }) {
  const sorted = [...edges].sort((a, b) => (a.ts < b.ts ? -1 : 1));
  if (!sorted.length) return <div className="empty">No events recorded</div>;

  return (
    <ul className="flow-list">
      {sorted.map((e, i) => {
        if (e.type === "withdrawal") {
          return (
            <li key={i} className="flow-item">
              <span className="flow-time">{hhmm(e.ts)}</span>
              <span className="flow-withdrawal">{inr(e.amount)} OUT at {shortId(e.dst)}</span>
              <span style={{ color: "var(--muted)" }}>cash leaves the system</span>
            </li>
          );
        }
        if (e.type === "shared_attribute") {
          return (
            <li key={i} className="flow-item">
              <span className="flow-time">{hhmm(e.ts)}</span>
              <span>🔗 {shortId(e.src)} ↔ {shortId(e.dst)}</span>
              <span style={{ color: "var(--muted)" }}>shared device / identifier</span>
            </li>
          );
        }
        return (
          <li key={i} className="flow-item">
            <span className="flow-time">{hhmm(e.ts)}</span>
            <span className="flow-amount">{inr(e.amount)}</span>
            <span>{shortId(e.src)} → {shortId(e.dst)}</span>
          </li>
        );
      })}
    </ul>
  );
}
