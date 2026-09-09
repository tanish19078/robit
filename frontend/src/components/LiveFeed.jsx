import { useState, useEffect, useRef } from "react";
import { sseConnect } from "../api";
import { shortId, hhmm } from "../utils";

export default function LiveFeed({ incidentId }) {
  const [items, setItems] = useState([]);
  const esRef = useRef(null);

  useEffect(() => {
    if (!incidentId) return;
    esRef.current?.close();
    setItems([]);

    const es = sseConnect(incidentId, (d) => {
      if (d.kind === "event") {
        const e = d.event;
        const msg = `+ ${e.type} ${e.amount || ""} ${shortId(e.src)} → ${shortId(e.dst || e.terminal_id)} @${hhmm(e.ts)}`;
        setItems((prev) => [msg, ...prev].slice(0, 12));
      } else if (d.kind === "forecast") {
        const a = d.alert;
        const msg = `forecast: ${a.risk_tier} ${a.probable_cashout_cells?.[0]?.h3_cell || ""}`;
        setItems((prev) => [msg, ...prev].slice(0, 12));
      }
    });
    esRef.current = es;

    return () => es.close();
  }, [incidentId]);

  if (!items.length) {
    return <div className="empty" style={{ textAlign: "left", padding: 0 }}>Waiting for events…</div>;
  }

  return (
    <ul className="live-feed">
      {items.map((msg, i) => <li key={i}>{msg}</li>)}
    </ul>
  );
}
