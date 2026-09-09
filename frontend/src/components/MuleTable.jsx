import { shortId } from "../utils";

export default function MuleTable({ nodes = [] }) {
  if (!nodes.length) return <div className="empty">No suspect data available</div>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Account</th>
          <th>Baseline</th>
          <th>Learned</th>
          <th>Final</th>
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((n) => (
          <tr key={n.id}>
            <td>{shortId(n.id)}</td>
            <td>{n.baseline}</td>
            <td>{n.learned}</td>
            <td><strong>{n.final}</strong></td>
            <td style={{ fontSize: 12, color: "var(--muted)" }}>
              {(n.evidence || []).join("; ") || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
