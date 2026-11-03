import { useState, useEffect, useRef } from 'react';
import { sseConnect } from '../api';
import { shortId, hhmm } from '../utils';

export default function LiveFeed({ incidentId }) {
  const [items, setItems] = useState([]);
  const esRef = useRef(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    if (!incidentId) return;
    esRef.current?.close();
    setItems([]);
    sequenceRef.current = 0;
    const addItem = (message) => {
      const id = sequenceRef.current++;
      setItems((prev) => [{ id, message }, ...prev].slice(0, 12));
    };

    const es = sseConnect(incidentId, (d) => {
      if (d.kind === 'event') {
        const e = d.event;
        const msg = `+ ${e.type} ${e.amount || ''} ${shortId(e.src)} → ${shortId(e.dst || e.terminal_id)} @${hhmm(e.ts)}`;
        addItem(msg);
      } else if (d.kind === 'forecast') {
        const a = d.alert;
        const msg = `forecast: ${a.risk_tier} ${a.probable_cashout_cells?.[0]?.h3_cell || ''}`;
        addItem(msg);
      }
    });
    esRef.current = es;

    return () => es.close();
  }, [incidentId]);

  if (!items.length) {
    return (
      <div className="empty" style={{ textAlign: 'left', padding: 0 }}>
        Waiting for events…
      </div>
    );
  }

  return (
    <ul className="feed" aria-live="polite">
      {items.map((item) => (
        <li key={item.id}>{item.message}</li>
      ))}
    </ul>
  );
}
