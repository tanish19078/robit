import { shortId } from '../utils';

export default function MuleTable({ nodes = [] }) {
  if (!nodes.length) return <div className="empty">No account scores in this graph.</div>;
  return (
    <table className="table table-cards">
      <caption className="sr-only">Ranked account suspicion scores with model evidence</caption>
      <thead>
        <tr>
          <th scope="col">Account</th>
          <th scope="col">Baseline</th>
          <th scope="col">Peer anomaly</th>
          <th scope="col">Final score</th>
          <th scope="col">Evidence</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((node) => (
          <tr key={node.id}>
            <td data-label="Account" className="mono">
              {shortId(node.id)}
            </td>
            <td data-label="Baseline" className="nums">
              {node.baseline}
            </td>
            <td data-label="Peer anomaly" className="nums">
              {node.learned}
            </td>
            <td data-label="Final score" className="nums">
              <strong>{node.final}</strong>
            </td>
            <td data-label="Evidence" className="muted">
              {node.evidence?.join('; ') || 'No rule evidence'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
