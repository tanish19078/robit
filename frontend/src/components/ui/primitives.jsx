/** Shared layout and display primitives, so pages stop carrying style objects. */

export function Card({ title, note, action, lead, flush, className = "", children, ...rest }) {
  const cls = ["card", lead ? "card-lead" : "", flush ? "card-pad-0" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={cls} {...rest}>
      {(title || action || note) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {note && <p className="card-note">{note}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Button({ variant = "", size = "", pressed, className = "", children, ...rest }) {
  const cls = [
    "btn",
    variant ? `btn-${variant}` : "",
    size ? `btn-${size}` : "",
    pressed !== undefined ? "btn-toggle" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} aria-pressed={pressed} {...rest}>
      {children}
    </button>
  );
}

/**
 * A single headline number. Values wear ink rather than a series color, and
 * proportional figures rather than tabular — equal-width digits make large
 * numbers look loose.
 */
export function StatTile({ value, label, note, hero }) {
  return (
    <div className="card stat">
      <div className={hero ? "hero-value" : "stat-value"}>{value ?? "—"}</div>
      <div className="stat-label">{label}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

/** Ratio against a limit. `lead` takes the accent; the rest recede. */
export function Meter({ value, max = 1, lead, label }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <span
      className="meter"
      role="img"
      aria-label={label || `${Math.round(pct)} percent`}
    >
      <span className={`meter-fill ${lead ? "meter-fill-lead" : "meter-fill-rest"}`}
        style={{ width: `${pct}%` }} />
    </span>
  );
}

export function KeyValue({ rows }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ children, action }) {
  return (
    <div className="empty">
      <p>{children}</p>
      {action && <div style={{ marginTop: "var(--s3)" }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%", style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />;
}

/** Full-card loading state that holds roughly the shape of the real content. */
export function LoadingCard({ lines = 3, title }) {
  return (
    <Card title={title}>
      <div className="stack" aria-busy="true">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} />
        ))}
      </div>
    </Card>
  );
}
