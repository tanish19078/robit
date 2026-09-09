/** Shared formatters and display helpers. */

export function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

export function hhmm(ts) {
  return (ts || "").slice(11, 16);
}

export function shortId(id) {
  return String(id)
    .replace("acct_hash_", "acct ")
    .replace("victim_hash", "victim");
}

export function riskColor(val) {
  if (val > 0.65) return "var(--red)";
  if (val >= 0.35) return "var(--amber)";
  return "var(--green)";
}

export const TIER_COLORS = {
  Green: "var(--green)",
  Amber: "var(--amber)",
  Red: "var(--red)",
  Critical: "var(--purple)",
};

export function tierClass(tier) {
  return `tier-${(tier || "").toLowerCase()}`;
}

export function dateFmt(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
