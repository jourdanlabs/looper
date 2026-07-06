// TierBadge — renders a tier name (Now / Next / Later / Watchlist / Cold /
// Archived) with its value-coded style. Only NOW carries the green accent;
// everything else is monochrome by design.
//
//   <TierBadge tier="Now" />
//
// FundingBadge — the allocation outcome (FUNDED / BENCHED / HELD_DUPLICATE).
//
//   <FundingBadge funding="FUNDED" />

const TIER_CLASS = {
  Now: "tier-now",
  Next: "tier-next",
  Later: "tier-later",
  Watchlist: "tier-watchlist",
  Cold: "tier-cold",
  Archived: "tier-archived",
};

export default function TierBadge({ tier, className = "", ...rest }) {
  const cls = TIER_CLASS[tier] || "tier-later";
  return (
    <span className={`badge ${cls}${className ? " " + className : ""}`} {...rest}>
      {tier}
    </span>
  );
}

const FUND_CLASS = {
  FUNDED: "fund-funded",
  BENCHED: "fund-benched",
  HELD_DUPLICATE: "fund-held",
};
const FUND_LABEL = {
  FUNDED: "Funded",
  BENCHED: "Benched",
  HELD_DUPLICATE: "Held · dup",
};

export function FundingBadge({ funding, className = "", ...rest }) {
  const cls = FUND_CLASS[funding] || "fund-benched";
  return (
    <span className={`badge ${cls}${className ? " " + className : ""}`} {...rest}>
      {FUND_LABEL[funding] || funding}
    </span>
  );
}
