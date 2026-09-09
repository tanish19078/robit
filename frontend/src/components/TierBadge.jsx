import { tierClass } from "../utils";

export default function TierBadge({ tier, large, children }) {
  const cls = `tier-badge ${tierClass(tier)}${large ? " large" : ""}`;
  return <span className={cls}>{children || tier || "—"}</span>;
}
