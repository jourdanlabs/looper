// /portfolio — the structural "where's growth?" view, the "Allocation &
// Capacity" reskin.
//
// Ranking answers "what's next." This answers what the cabinet actually argues
// about: of the work we're FUNDING, what is it made of? The Stitch view frames
// it as a macro resource picture — a stat bar, three allocation cards under a
// distribution lens (value type / talent / mandate / time-to-realize), and a
// funded-initiative capacity roster — over which we lay the structural insight
// banner ("X% of funded NPV is cost-defensive, Y% is revenue — where's
// growth?").
//
// Every number comes from result.portfolio (lib/portfolio.mjs). Nothing is
// re-scored here. Server component: the engine uses node:crypto, so this is
// force-dynamic, and only a plain, serializable slice crosses to the client
// (the live Ledger instance never does).

import { money } from "../../lib/brief.mjs";
import { runPrioritize } from "../../lib/store/run.mjs";
import { BUSINESS_IMPACT } from "../../lib/types.mjs";
import PortfolioClient from "../../components/portfolio/PortfolioClient.jsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio · LOOPER" };

// Which value types are "growth-bearing" vs "cost/risk-defensive". This is the
// strategic lens the methodology names: a portfolio can be perfectly ranked and
// still be structurally all-defense. We split the FUNDED NPV by this lens to
// surface the honest read, not to re-rank anything.
const GROWTH_TYPES = new Set([
  "Direct Customer Revenue",
  "Strategic-Optionality",
]);

// Fallback business-impact (the seed sets it on every funded row; the roster
// axis must never go blank). Maps an owning area to its channel.
const AREA_TO_IMPACT = {
  Payments: BUSINESS_IMPACT.PARTNER,
  "Developer Platform": BUSINESS_IMPACT.PARTNER,
  Growth: BUSINESS_IMPACT.CONSUMER,
  Sales: BUSINESS_IMPACT.CONSUMER,
  "Trust & Safety": BUSINESS_IMPACT.CONSUMER,
};
const impactOf = (it) =>
  it.businessImpact || AREA_TO_IMPACT[it.area] || BUSINESS_IMPACT.PLATFORM;

export default async function PortfolioPage() {
  const { result: r } = await runPrioritize({ capacity: 12 });
  const p = r.portfolio;

  // ── structural insight from funded NPV (deterministic, engine-derived) ────
  const npvRows = p.byValueType.fundedNpv;
  const npvTotal = npvRows.reduce((a, b) => a + b.value, 0);
  const pctOf = (v) => (npvTotal > 0 ? Math.round((v / npvTotal) * 100) : 0);

  const growthNpv = npvRows
    .filter((b) => GROWTH_TYPES.has(b.key))
    .reduce((a, b) => a + b.value, 0);
  const growthPct = pctOf(growthNpv);
  const defensivePct = npvTotal > 0 ? 100 - growthPct : 0;

  const fundedGrowthCount = r.funded.filter(
    (it) => GROWTH_TYPES.has(it.valueType) && it.mandate !== true
  ).length;
  const optionalityFunded =
    p.byValueType.funded.find((b) => b.key === "Strategic-Optionality")?.count ??
    0;

  // banner is "flag" (green) only when growth is genuinely represented;
  // otherwise it carries the plain ink/warning read. Honest either way.
  const growthThin = growthPct < 40 || optionalityFunded === 0;

  // largest funded-NPV slice gets the green accent in the value-type lens.
  const maxNpv = Math.max(...npvRows.map((b) => b.value), 0);

  // ── distribution lenses (funded), accent = single green per the design ───
  // value-type lens accents the largest funded-NPV bucket (the structural mix);
  // the others accent their "good" bucket (mandate-pinned / realizes-this-year).
  const lenses = {
    value: p.byValueType.funded.map((b) => ({
      key: b.key,
      count: b.count,
      pct: b.pct,
      accent:
        GROWTH_TYPES.has(b.key) &&
        b.count > 0 &&
        (npvRows.find((n) => n.key === b.key)?.value ?? 0) === maxNpv,
    })),
    talent: p.byTalentProfile.funded.map((b) => ({
      key: b.key,
      count: b.count,
      pct: b.pct,
      accent: false, // capacity lens — Staff+ is a draw, never a boost
    })),
    mandate: p.byMandate.funded.map((b) => ({
      key: b.key,
      count: b.count,
      pct: b.pct,
      accent: b.key === "Mandate" && b.count > 0,
    })),
    time: p.byTimeToRealize.funded.map((b) => ({
      key: b.key,
      count: b.count,
      pct: b.pct,
      accent: b.key === "This year" && b.count > 0,
    })),
  };

  // ── funded capacity roster (plain, serializable; ledger never crosses) ────
  // status: mandate rows read MANDATE (auto-pinned to Now), the rest FUNDED.
  const roster = r.funded.map((it) => {
    const npv = it._breakdown?.npv?.total ?? 0;
    return {
      id: it.id,
      title: it.title,
      area: it.area,
      impact: impactOf(it),
      valueType: it.valueType,
      status: it.mandate === true ? "MANDATE" : "FUNDED",
      rank: it._rank,
      teams: it._teams,
      npvMoney: money(npv),
      npvShort: Math.round(npv / 100000), // deterministic seed for the roster countdown
      mandate: it.mandate === true,
    };
  });

  const utilization =
    r.capacity > 0 ? Math.round((r.capacityUsed / r.capacity) * 1000) / 10 : 0;

  return (
    <PortfolioClient
      header={{
        titleTag: "PORTFOLIO ALLOCATION // WHERE'S GROWTH?",
        subtitle: `STRUCTURAL VIEW / FUNDED SLATE · ${p.fundedCount} OF ${p.total} INITIATIVES`,
        env: "PRD_SECURE",
      }}
      stats={{
        npvMoney: money(p.fundedNpvTotal),
        capacityUsed: r.capacityUsed,
        capacity: r.capacity,
        utilization,
        atMax: r.capacityUsed >= r.capacity,
      }}
      lenses={lenses}
      roster={roster}
      receipts={{
        head: r.head ? r.head.slice(0, 12) : "—",
        chainOk: r.verify.ok,
        chainCount: r.verify.ok ? r.verify.count : 0,
        methodology: r.methodology_version,
      }}
      insight={{
        npvTotalMoney: money(npvTotal),
        defensivePct,
        growthPct,
        fundedGrowthCount,
        optionalityFunded,
        growthThin,
      }}
    />
  );
}
