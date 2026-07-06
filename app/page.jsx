// Board — THE money screen. (Stitch reskin.)
//
// The published, tiered prioritization queue (Now…Archived), regenerated from
// the chain so it cannot go stale. This is the cabinet-meeting artifact: every
// row carries its 0–100 score, its tier, its funding call, and — on expand — the
// full score-breakdown receipt and the ledger receipt trail that proves the
// "why". A stat strip shows the live portfolio numbers and the chain-verify
// state; filter chips slice by business impact (Partner/Consumer/Platform).
//
// Server component: it calls the engine directly (node:crypto for the chain),
// then hands a plain, serializable slice to the client board. No scoring or
// tiering logic lives in the UI — it reads the engine result. The markup is the
// prioritization board, now rendering REAL engine output instead of mock
// numbers.

import { BUSINESS_IMPACT } from "../lib/types.mjs";
import { renderBrief, money } from "../lib/brief.mjs";
import { runPrioritize } from "../lib/store/run.mjs";
import BoardClient from "../components/board/BoardClient.jsx";
import GuidedTour from "../components/tour/GuidedTour.jsx";

export const dynamic = "force-dynamic";

// Fallback business-impact derivation for any item that didn't carry one
// explicitly (the seed sets it on every row, but the readout axis must never go
// blank). Maps an owning area to its channel; defaults to Platform (internal).
const AREA_TO_IMPACT = {
  Payments: BUSINESS_IMPACT.PARTNER,
  "Developer Platform": BUSINESS_IMPACT.PARTNER,
  Growth: BUSINESS_IMPACT.CONSUMER,
  Sales: BUSINESS_IMPACT.CONSUMER,
  "Trust & Safety": BUSINESS_IMPACT.CONSUMER,
};
function impactOf(it) {
  return it.businessImpact || AREA_TO_IMPACT[it.area] || BUSINESS_IMPACT.PLATFORM;
}

export default async function Page() {
  const { result: r, meta } = await runPrioritize({ capacity: 12 });

  // Serialize a clean, client-safe slice. Each row carries the breakdown receipt
  // and its full ledger trail so the client can render the "why" without the
  // engine (the Ledger instance itself isn't serializable across the boundary).
  const rows = r.ranked.map((it) => ({
    id: it.id,
    rank: it._rank,
    title: it.title,
    area: it.area,
    sponsor: it.sponsor,
    valueType: it.valueType,
    impact: impactOf(it),
    reachUnit: it.reach?.unit || "",
    mandate: it.mandate === true,
    mandateCitation: it.mandateCitation || null,
    budgetCyclePosition: it.budgetCyclePosition || null,
    score: it._score,
    tier: it._tier,
    funding: it._funding,
    teams: it._teams,
    // First ledger event for the row, short sha — Stitch shows a sha next to the
    // sponsor line. We surface the row's intake receipt (its provenance anchor).
    sha: (r.ledger.receiptsFor(it.id)[0] || {}).short || "",
    methodologyVersion: it._breakdown?.methodologyVersion || r.methodology_version,
    breakdown: it._breakdown,
    receipts: r.ledger.receiptsFor(it.id).map((e) => ({
      kind: e.kind,
      short: e.short,
      sha: e.sha,
    })),
  }));

  const chainOk = r.verify.ok;

  // The live stat strip — every figure straight from the engine result. money()
  // is the engine's own compact formatter (lib/brief.mjs), so "$16.1M" here is
  // byte-identical to the figure the markdown export prints.
  const stats = [
    { label: "FUNDED", value: String(r.stats.funded) },
    { label: "BENCHED", value: String(r.stats.benched) },
    { label: "DUPLICATES HELD", value: String(r.stats.held_duplicates) },
    { label: "CAPACITY", value: `${r.capacityUsed}/${r.capacity} TEAMS` },
    { label: "IN-YEAR NPV", value: money(r.stats.fundedNpvTotal), wide: true },
  ];

  const brief = renderBrief(r);

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-gutter py-margin flex flex-col gap-margin">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-unit" data-tour="identity">
        <h1 className="font-headline-lg text-headline-lg text-primary">LOOPER</h1>
        <p className="font-data-mono text-data-mono text-on-surface-variant">
          PRIORITY QUEUE &amp; ALLOCATION
        </p>
      </header>

      {/* ── Stat Strip (live engine stats) ───────────────────────────────────── */}
      <section
        className="grid grid-cols-2 md:grid-cols-5 border-t-technical border-l-technical bg-surface-container-lowest"
        data-tour="stats"
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className={`border-r-technical border-b-technical p-3 flex flex-col gap-1${
              s.wide ? " col-span-2 md:col-span-1" : ""
            }`}
          >
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              {s.label}
            </span>
            <span className="font-data-mono text-data-mono text-primary text-lg">{s.value}</span>
          </div>
        ))}
      </section>

      {/* ── Chain-verify line (methodology + tamper-evidence, from the engine) ── */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 font-data-mono text-data-mono -mt-2"
        data-tour="chain"
      >
        <span className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 border border-primary ${
              chainOk ? "bg-secondary" : "bg-primary"
            }`}
            aria-hidden="true"
          />
          <span className={chainOk ? "text-secondary" : "text-error"}>
            {chainOk ? "CHAIN VERIFIED" : "CHAIN BROKEN"}
          </span>
        </span>
        <span className="text-on-surface-variant">·</span>
        <span className="text-on-surface-variant">{r.verify.count} EVENTS</span>
        <span className="text-on-surface-variant">·</span>
        <span className="text-on-surface-variant">HEAD {(r.head || "").slice(0, 8)}</span>
        <span className="text-on-surface-variant">·</span>
        <span className="text-on-surface-variant">METHODOLOGY {r.methodology_version}</span>
        <span className="text-on-surface-variant">·</span>
        <span className="text-on-surface-variant">
          {r.stats.intake} INTAKEN · {r.stats.rejected} REFUSED ·{" "}
          {r.stats.duplicate_clusters} DUPLICATE CLUSTER
          {r.stats.duplicate_clusters === 1 ? "" : "S"}
        </span>
        <span className="text-on-surface-variant">·</span>
        <span className={meta.mode === "jira" ? "text-secondary" : "text-on-surface-variant"}>
          SOURCE {meta.mode?.toUpperCase() ?? "SEED"}
          {meta.count != null ? ` (${meta.count})` : ""}
        </span>
      </div>

      {!chainOk ? (
        <div className="technical-border bg-surface-container-lowest p-4 font-data-mono text-data-mono text-on-surface-variant">
          <span className="font-label-caps text-label-caps text-error block mb-1">
            CHAIN INTEGRITY FAILURE
          </span>
          verify() reports a broken link at event {r.verify.brokeAt} ({r.verify.reason}). This board
          is rendered, but the record is no longer tamper-evident — do not treat it as the system of
          record until the chain is restored.
        </div>
      ) : null}

      {/* ── Filter chips + the tiered queue (interactive) ────────────────────── */}
      <BoardClient
        rows={rows}
        clusters={r.clusters}
        rejected={r.rejected}
        brief={brief}
        head={(r.head || "").slice(0, 8)}
      />

      {/* ── Guided tour — first-run spotlight walkthrough of this board ───────── */}
      <GuidedTour />
    </main>
  );
}
