import { useRef, useEffect } from "react";
import { hhmm, inr } from "../utils";

export default function ExcitationChart({ breakdown = [], tierDetail = {} }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !breakdown.length) { if (svg) svg.innerHTML = ""; return; }

    const W = svg.clientWidth || 540;
    const H = 190;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";

    const NS = "http://www.w3.org/2000/svg";
    const base = Date.parse(breakdown.reduce((m, p) => (p.ts < m ? p.ts : m), breakdown[0].ts));
    const tmax = Math.max(...breakdown.map((p) => (Date.parse(p.ts) - base) / 60000), 1);
    const ymax = Math.max(tierDetail.red_cut || 2, ...breakdown.map((p) => p.contribution)) * 1.2;

    const X = (ts) => 48 + ((Date.parse(ts) - base) / 60000 / tmax) * (W - 68);
    const Y = (v) => H - 28 - (v / ymax) * (H - 58);

    const mkLine = (x1, y1, x2, y2, color, dash) => {
      const e = document.createElementNS(NS, "line");
      e.setAttribute("x1", x1); e.setAttribute("y1", y1);
      e.setAttribute("x2", x2); e.setAttribute("y2", y2);
      e.setAttribute("stroke", color); e.setAttribute("stroke-width", "1");
      if (dash) e.setAttribute("stroke-dasharray", "4,3");
      svg.appendChild(e);
    };

    // threshold lines
    if (tierDetail.amber_cut) mkLine(48, Y(tierDetail.amber_cut), W - 20, Y(tierDetail.amber_cut), "#ffa63d", true);
    if (tierDetail.red_cut) mkLine(48, Y(tierDetail.red_cut), W - 20, Y(tierDetail.red_cut), "#ff5a5a", true);

    // bars
    for (const p of breakdown) {
      const x = X(p.ts);
      const bw = Math.max(18, (W - 68) / Math.max(1, breakdown.length) / 2.5);
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", x - bw / 2); rect.setAttribute("y", Y(p.contribution));
      rect.setAttribute("width", bw); rect.setAttribute("height", H - 28 - Y(p.contribution));
      rect.setAttribute("fill", "#4da3ff"); rect.setAttribute("opacity", "0.85"); rect.setAttribute("rx", "3");
      const title = document.createElementNS(NS, "title");
      title.textContent = `${p.event_id}: ${inr(p.amount)}, +${p.contribution} (${p.burst_peers} burst peers)`;
      rect.appendChild(title);
      svg.appendChild(rect);

      const lb = document.createElementNS(NS, "text");
      lb.setAttribute("x", x); lb.setAttribute("y", H - 10);
      lb.setAttribute("text-anchor", "middle"); lb.setAttribute("font-size", "9"); lb.setAttribute("fill", "#8b95a5");
      lb.textContent = hhmm(p.ts);
      svg.appendChild(lb);
    }

    // caption
    const cap = document.createElementNS(NS, "text");
    cap.setAttribute("x", 48); cap.setAttribute("y", 14);
    cap.setAttribute("font-size", "10"); cap.setAttribute("fill", "#8b95a5");
    cap.textContent = `Each bar = one transfer's share of S=${tierDetail.intensity ?? "?"} (hover for detail)`;
    svg.appendChild(cap);
  }, [breakdown, tierDetail]);

  return <svg ref={svgRef} className="svg-container" style={{ height: 190 }} />;
}
