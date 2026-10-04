import { useCallback, useState } from "react";
import { Button } from "./primitives";

/**
 * Chart chrome: title, legend, a table-view twin and a tooltip host.
 *
 * The table view is not a nicety — it is the relief channel. Light-mode
 * --series-3 sits at 2.74:1, under the 3:1 mark floor, and a hover tooltip
 * must never be the only way to read a value. Every chart wrapped here can be
 * read as numbers instead.
 */
export default function ChartFrame({
  title,
  note,
  legend,
  table,
  caption,
  children,
  tip,
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="chart">
      <div className="chart-head">
        <div>
          <h3 className="card-title">{title}</h3>
          {note && <p className="card-note">{note}</p>}
        </div>
        {table && (
          <Button
            size="sm"
            variant="ghost"
            pressed={showTable}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? "Chart" : "Table"}
          </Button>
        )}
      </div>

      {showTable ? (
        <div className="chart-table">{table}</div>
      ) : (
        <>
          {children}
          {tip && (
            <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="status">
              <div className="chart-tip-title">{tip.title}</div>
              {(tip.rows || []).map(([k, v]) => (
                <div className="chart-tip-row" key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {legend?.length > 1 && (
        <ul className="legend list-reset">
          {legend.map((l) => (
            <li className="legend-item" key={l.label}>
              <span
                className={[
                  "legend-swatch",
                  l.line ? "legend-swatch-line" : "",
                  l.dashed ? "legend-swatch-dashed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={l.line ? { borderTopColor: l.color } : { background: l.color }}
                aria-hidden="true"
              />
              <span>{l.label}</span>
            </li>
          ))}
        </ul>
      )}

      {caption && <p className="chart-caption">{caption}</p>}
    </div>
  );
}

/**
 * Tooltip state for a chart. Keyboard focus calls the same show() as hover, so
 * the two paths can never drift apart.
 */
export function useChartTip() {
  const [tip, setTip] = useState(null);
  const show = useCallback((x, y, title, rows) => setTip({ x, y, title, rows }), []);
  const hide = useCallback(() => setTip(null), []);
  return { tip, show, hide };
}
