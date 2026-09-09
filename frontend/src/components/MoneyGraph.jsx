import { useRef, useEffect } from "react";
import { shortId, riskColor, inr, hhmm } from "../utils";

export default function MoneyGraph({ graph, muleScores = {} }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !graph?.nodes?.length) { svg.innerHTML = ""; return; }

    const W = svg.clientWidth || 540;
    const H = 260;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";

    const NS = "http://www.w3.org/2000/svg";
    const byHop = {};
    for (const n of graph.nodes) (byHop[n.hop] = byHop[n.hop] || []).push(n);
    const hops = Object.keys(byHop).map(Number).sort((a, b) => a - b);

    const pos = {};
    hops.forEach((h, ci) => {
      byHop[h].forEach((n, ri, col) => {
        pos[n.id] = {
          x: 60 + (ci * (W - 120)) / Math.max(1, hops.length - 1),
          y: 40 + (ri * (H - 80)) / Math.max(1, col.length - 1 || 1),
        };
      });
    });

    const mkText = (x, y, text, size, fill) => {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", x); t.setAttribute("y", y);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", size);
      t.setAttribute("fill", fill || "#c6cfdb");
      t.textContent = text;
      svg.appendChild(t);
    };

    for (const e of graph.edges || []) {
      if (!pos[e.src] || !pos[e.dst]) continue;
      const a = pos[e.src], b = pos[e.dst];
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", a.x); l.setAttribute("y1", a.y);
      l.setAttribute("x2", b.x); l.setAttribute("y2", b.y);
      l.setAttribute("stroke",
        e.type === "withdrawal" ? "#ff5a5a" :
        e.type === "shared_attribute" ? "#6b7686" : "#4da3ff"
      );
      l.setAttribute("stroke-width", "2");
      if (e.type === "shared_attribute") l.setAttribute("stroke-dasharray", "5,4");
      svg.appendChild(l);
      if (e.type !== "shared_attribute") {
        mkText((a.x + b.x) / 2, (a.y + b.y) / 2 - 8,
          `${inr(e.amount)} · ${hhmm(e.ts)}`, "9.5", "#8b95a5");
      }
    }

    for (const n of graph.nodes) {
      const p = pos[n.id];
      const score = muleScores[n.id] || 0;
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", "18");
      c.setAttribute("fill", riskColor(score)); c.setAttribute("opacity", "0.9");
      svg.appendChild(c);
      mkText(p.x, p.y + 5, score.toFixed(2), "10", "#0b0f14");
      mkText(p.x, p.y + 38, shortId(n.id).slice(0, 14), "10");
    }
  }, [graph, muleScores]);

  return <svg ref={svgRef} className="svg-container" style={{ height: 260 }} />;
}
