import { useEffect, useRef } from 'react';
import { hhmm, inr } from '../utils';
import ChartFrame from './ui/ChartFrame';

export default function ExcitationChart({ breakdown = [], tierDetail = {} }) {
  const svgRef = useRef(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (!breakdown.length) {
      svg.replaceChildren();
      return;
    }

    const draw = () => {
      const W = svg.clientWidth || 540;
      const H = 210;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.replaceChildren();
      const NS = 'http://www.w3.org/2000/svg';
      const firstTs = [...breakdown].sort((a, b) => a.ts.localeCompare(b.ts))[0].ts;
      const base = Date.parse(firstTs);
      const end = Math.max(...breakdown.map((p) => Date.parse(p.ts)));
      const span = Math.max((end - base) / 60000, 1);
      const ymax = Math.max(tierDetail.red_cut || 2, ...breakdown.map((p) => p.contribution)) * 1.2;
      const xOf = (ts) => 42 + ((Date.parse(ts) - base) / 60000 / span) * (W - 58);
      const yOf = (value) => H - 28 - (value / ymax) * (H - 62);
      const line = (y, color) => {
        const element = document.createElementNS(NS, 'line');
        element.setAttribute('x1', '42');
        element.setAttribute('x2', String(W - 16));
        element.setAttribute('y1', String(y));
        element.setAttribute('y2', String(y));
        element.setAttribute('stroke', color);
        element.setAttribute('stroke-width', '1');
        element.setAttribute('stroke-dasharray', '5 4');
        svg.appendChild(element);
      };
      if (tierDetail.amber_cut) line(yOf(tierDetail.amber_cut), 'var(--status-warning)');
      if (tierDetail.red_cut) line(yOf(tierDetail.red_cut), 'var(--status-serious)');
      for (const [index, point] of breakdown.entries()) {
        const x = xOf(point.ts);
        const width = Math.max(12, Math.min(28, ((W - 58) / Math.max(breakdown.length, 1)) * 0.55));
        const bar = document.createElementNS(NS, 'rect');
        bar.setAttribute('x', String(x - width / 2));
        bar.setAttribute('y', String(yOf(point.contribution)));
        bar.setAttribute('width', String(width));
        bar.setAttribute('height', String(Math.max(1, H - 28 - yOf(point.contribution))));
        bar.setAttribute('rx', '3');
        bar.setAttribute('fill', 'var(--series-1)');
        bar.setAttribute('tabindex', '0');
        bar.setAttribute('role', 'img');
        bar.setAttribute(
          'aria-label',
          `${point.event_id || `Transfer ${index + 1}`}: ${inr(point.amount)}, contribution ${point.contribution}, ${point.burst_peers} burst peers`,
        );
        const title = document.createElementNS(NS, 'title');
        title.textContent = `${point.event_id}: ${inr(point.amount)} · +${point.contribution} · ${point.burst_peers} burst peers`;
        bar.appendChild(title);
        svg.appendChild(bar);
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', String(x));
        label.setAttribute('y', String(H - 9));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '10');
        label.setAttribute('fill', 'var(--ink-secondary)');
        label.textContent = hhmm(point.ts);
        svg.appendChild(label);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [breakdown, tierDetail]);

  const table = (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Event</th>
          <th>Amount</th>
          <th>Contribution to S</th>
          <th>Burst peers</th>
        </tr>
      </thead>
      <tbody>
        {breakdown.map((point, index) => (
          <tr key={point.event_id}>
            <td>{hhmm(point.ts)}</td>
            <td>{point.event_id || `Transfer ${index + 1}`}</td>
            <td>{inr(point.amount)}</td>
            <td className="num">{point.contribution}</td>
            <td className="num">{point.burst_peers}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const legend = [
    { label: 'Transfer contribution', color: 'var(--series-1)' },
    {
      label: `Amber threshold ${tierDetail.amber_cut ?? '—'}`,
      color: 'var(--status-warning)',
      line: true,
    },
    {
      label: `Red threshold ${tierDetail.red_cut ?? '—'}`,
      color: 'var(--status-serious)',
      line: true,
    },
  ];
  return (
    <ChartFrame
      title="Excitation contribution"
      note={`Transfer contributions sum to S = ${tierDetail.intensity ?? '—'}. Select Table for exact values.`}
      table={table}
      legend={legend}
    >
      <svg
        ref={svgRef}
        className="chart-surface excitation-chart"
        role="img"
        aria-label="Transfer contribution to the burst excitation score by event time"
      />
    </ChartFrame>
  );
}
