/**
 * Risk-tier badge.
 *
 * Tiers are a status scale, so each one ships a distinct glyph and a text
 * label alongside the hue. That is not decoration: on the light surface Amber
 * (#fab219, 1.79:1) and Red (#ec835a, 2.57:1) sit below the 3:1 mark floor, so
 * color alone cannot carry the meaning — and a colour-blind or monochrome
 * reader has to get the tier from the shape and the word.
 *
 * The glyphs are deliberately different silhouettes rather than four variants
 * of one circle: check, triangle, exclamation-circle, octagon.
 */

const GLYPH = {
  Green: (
    <path d="M13.5 4.5 6.5 11.5 2.5 7.5" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" />
  ),
  Amber: (
    <>
      <path d="M8 2 15 14H1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 6.5v3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.95" fill="currentColor" />
    </>
  ),
  Red: (
    <>
      <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4.4v4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="11.3" r="0.95" fill="currentColor" />
    </>
  ),
  Critical: (
    <>
      <path d="M5.3 1.6h5.4L14.4 5.3v5.4l-3.7 3.7H5.3L1.6 10.7V5.3Z"
        fill="currentColor" stroke="none" />
      <path d="M8 4.6v4.2" stroke="var(--surface-1)" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="1" fill="var(--surface-1)" />
    </>
  ),
};

const CLASS = {
  Green: "tier-green",
  Amber: "tier-amber",
  Red: "tier-red",
  Critical: "tier-critical",
};

/** The label each tier means in plain words, for the badge's title. */
const MEANING = {
  Green: "below both thresholds",
  Amber: "analyst review",
  Red: "act now",
  Critical: "cash already leaving",
};

export function TierGlyph({ tier, size = 16 }) {
  const glyph = GLYPH[tier];
  if (!glyph) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {glyph}
    </svg>
  );
}

export default function TierBadge({ tier, size, className = "" }) {
  const known = Boolean(CLASS[tier]);
  const cls = [
    "tier",
    known ? CLASS[tier] : "tier-unknown",
    size === "lg" ? "tier-lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={cls} title={known ? `${tier} — ${MEANING[tier]}` : "No forecast yet"}>
      <TierGlyph tier={tier} size={size === "lg" ? 22 : 16} />
      <span>{known ? tier : "—"}</span>
    </span>
  );
}

/** Compact tier marker for table rows: glyph plus a screen-reader label. */
export function TierMark({ tier }) {
  const known = Boolean(CLASS[tier]);
  return (
    <span
      className={`tier ${known ? CLASS[tier] : "tier-unknown"}`}
      style={{ padding: "2px 6px", gap: 4, fontSize: "var(--text-sm)" }}
      title={known ? `${tier} — ${MEANING[tier]}` : "No forecast yet"}
    >
      <TierGlyph tier={tier} size={13} />
      <span>{known ? tier : "—"}</span>
    </span>
  );
}
