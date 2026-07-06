"use client";

// InitiativeRow — one line of the published board + its expandable receipt.
// (Stitch reskin — the initiative <article>.)
//
// Collapsed: rank · title (+ MANDATE auto-pin tag) · value-type · area/sponsor ·
//            sha · real 0–100 score · real 3-yr NPV · funding badge. Funding is
//            colour-coded exactly like Stitch — FUNDED green (check_circle),
//            BENCHED grey (pause), HELD — DUPLICATE amber (content_copy) with the
//            title struck through and a "N duplicates held — 'outcome'" subline.
// Expanded:  the Stitch REACH/IMPACT/CONFIDENCE/EFFORT summary, then the full
//            score-breakdown RECEIPT (RICE terms + NPV components + per-year
//            time-value table) and the LEDGER receipt trail (every event this
//            initiative produced on the chain, by sha). This is the "why" — not a
//            story, a replay of recorded, hashed decisions.
//
// Pure presentational of an engine `row` (a serialized slice of a ranked item).
// No engine logic here — every number is read straight off the breakdown receipt.

import { money } from "./money.js";

// Stitch shows value types in short uppercase form on the row.
const VALUE_TYPE_SHORT = {
  "Direct Customer Revenue": "REVENUE",
  "Direct Customer Service": "SERVICE",
  "Internal Enabler": "ENABLER",
  "Risk-Compliance": "RISK-COMPLIANCE",
  "Strategic-Optionality": "OPTIONALITY",
};

// Funding badge styling — the class strings are byte-identical to the Stitch
// board markup so the look is pixel-faithful: FUNDED green, BENCHED grey,
// HELD — DUPLICATE amber.
const FUNDING_BADGE = {
  FUNDED: {
    cls: "bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-2 py-1 flex items-center gap-1 border border-secondary",
    icon: "check_circle",
    label: "FUNDED",
  },
  BENCHED: {
    cls: "bg-surface-variant text-on-surface-variant font-label-caps text-label-caps px-2 py-1 flex items-center gap-1 border border-outline",
    icon: "pause",
    label: "BENCHED",
  },
  HELD_DUPLICATE: {
    cls: "bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps px-2 py-1 flex items-center gap-1 border border-tertiary-container",
    icon: "content_copy",
    label: "HELD — DUPLICATE",
  },
};

export default function InitiativeRow({ row, dedup, open, onToggle }) {
  const held = row.funding === "HELD_DUPLICATE";
  const benched = row.funding === "BENCHED";
  const b = row.breakdown || {};
  const rice = b.rice || {};
  const npv = b.npv || {};
  const badge = FUNDING_BADGE[row.funding] || FUNDING_BADGE.BENCHED;

  // Held duplicates render slightly dimmed with a dashed under-rule (Stitch);
  // benched rows get a soft dim as well.
  const articleDim = held ? "opacity-75" : benched ? "opacity-90" : "";
  const num = String(row.rank).padStart(2, "0");

  return (
    <article className={`technical-border bg-surface-container-lowest mb-unit ${articleDim}`}>
      {/* ── Row head (clickable) ──────────────────────────────────────────── */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container cursor-pointer transition-colors ${
          open || held ? "border-b-technical" : ""
        }${held ? " border-dashed" : ""}`}
      >
        <div className="flex items-start gap-4">
          <span className="font-data-mono text-data-mono text-outline w-6 mt-1 tabular-nums">
            {num}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`font-headline-sm text-headline-sm ${
                  held ? "text-on-surface-variant line-through" : "text-primary"
                }`}
              >
                {row.title}
              </h3>
              {row.mandate ? (
                <span className="bg-primary text-on-primary font-label-caps text-label-caps px-1 py-0.5 text-[10px]">
                  MANDATE
                </span>
              ) : null}
            </div>
            <div className="font-data-mono text-data-mono text-on-surface-variant flex items-center gap-2 flex-wrap">
              <span>{VALUE_TYPE_SHORT[row.valueType] || row.valueType}</span>
              <span>·</span>
              <span>
                {row.area}/Sponsor: {row.sponsor}
              </span>
              {row.sha ? (
                <>
                  <span>·</span>
                  <span className="text-outline">{row.sha}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="font-label-caps text-label-caps text-on-surface-variant">SCORE</span>
            <span
              className={`font-headline-sm text-headline-sm ${
                held ? "text-on-surface-variant" : "text-primary"
              }`}
            >
              {row.score}
            </span>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="font-label-caps text-label-caps text-on-surface-variant">NPV</span>
            <span className="font-data-mono text-data-mono text-primary">{money(npv.total)}</span>
          </div>
          <div className={badge.cls}>
            <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
            {badge.label}
          </div>
        </div>
      </div>

      {/* ── Held-duplicate subline (the "N duplicates held — outcome") ──────── */}
      {held && dedup ? (
        <div className="px-4 py-2 bg-surface-variant font-data-mono text-data-mono text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">subdirectory_arrow_right</span>
          {dedup.heldCount} duplicate{dedup.heldCount === 1 ? "" : "s"} held — &lsquo;{dedup.outcome}
          &rsquo;
        </div>
      ) : null}

      {/* ── Expanded receipt (the real RICE/NPV breakdown + ledger trail) ───── */}
      {open ? <ReceiptPanel row={row} rice={rice} npv={npv} dials={b.dials || {}} /> : null}
    </article>
  );
}

// ── the expanded receipt ────────────────────────────────────────────────────
function ReceiptPanel({ row, rice, npv, dials }) {
  return (
    <div className="bg-surface-container-lowest border-t-technical">
      {/* Stitch's 4-cell summary, now from the real breakdown */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Cell label="REACH">
          {`${fmtInt(rice.reach)} ${row.reachUnit || ""}`.trim() || "—"}
        </Cell>
        <Cell label="IMPACT · 3-YR NPV">{money(rice.impact)}</Cell>
        <Cell label="CONFIDENCE">
          {rice.confidence != null ? `${Math.round(rice.confidence * 100)}%` : "—"}
        </Cell>
        <Cell label="EFFORT · TEAM-WEEKS">{fmtInt(rice.effortTeamWeeks)}</Cell>
      </div>

      {/* The full RICE × NPV receipt + NPV components */}
      <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RICE breakdown */}
        <div className="border border-outline bg-surface-container-low p-3 flex flex-col gap-2">
          <span className="font-label-caps text-label-caps text-on-surface-variant border-b-technical pb-1">
            SCORE BREAKDOWN · RICE × NPV
          </span>
          <KV k="Reach" v={`${fmtInt(rice.reach)} ${row.reachUnit || ""}`.trim()} />
          <KV k="Reach factor (√)" v={fmt(rice.reachFactor)} />
          <KV k="Impact · 3-yr NPV" v={money(rice.impact)} strong />
          <KV
            k="Confidence"
            v={`${fmt(rice.confidence)} (${fmt(rice.deliveryConfidence)} × ${fmt(
              rice.valueConfidence
            )}${rice.talentFactor != null ? ` × ${fmt(rice.talentFactor)} ${rice.talentProfile}` : ""})`}
          />
          <KV k="Effort · team-weeks" v={fmtInt(rice.effortTeamWeeks)} />
          <KV k="Value-type weight" v={`${fmt(rice.valueTypeWeight)} (${rice.valueType || ""})`} />
          <KV k="Teams allocated" v={fmtInt(row.teams)} />
          <div className="border-t border-outline mt-1 pt-2 flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              DISPLAY SCORE
            </span>
            <span className="font-data-mono text-data-mono text-primary font-semibold">
              {row.score} / 100
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              METHODOLOGY
            </span>
            <span className="font-data-mono text-data-mono text-on-surface-variant">
              {row.methodologyVersion || "v1.0"}
            </span>
          </div>
        </div>

        {/* NPV components */}
        <div className="border border-outline bg-surface-container-low p-3 flex flex-col gap-2">
          <span className="font-label-caps text-label-caps text-on-surface-variant border-b-technical pb-1">
            3-YR NPV COMPONENTS · r={fmt(dials.r)} · H={fmtInt(dials.horizon)}
          </span>
          <NpvLine k="Revenue (net COGS)" v={npv.components?.revenue} />
          <NpvLine k="Cost-save (time-valued)" v={npv.components?.costSave} />
          <NpvLine k="Cost-avoid (× pAvoid)" v={npv.components?.costAvoid} />
          <NpvLine k="Risk reduction (× pRisk)" v={npv.components?.riskReduction} />
          <NpvLine k="Customer impact" v={npv.components?.customerImpact} />
          <NpvLine k="Ongoing TCO" v={npv.components?.ongoingTCO} />
          <div className="border-t border-outline mt-1 pt-2 flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              TOTAL NPV
            </span>
            <span className="font-data-mono text-data-mono text-primary font-semibold">
              {money(npv.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Per-year time-value table */}
      {Array.isArray(npv.perYear) && npv.perYear.length ? (
        <div className="px-4 pb-4">
          <div className="technical-border bg-surface-container-low">
            <div className="px-3 pt-3 pb-2 flex items-baseline justify-between gap-4 flex-wrap">
              <span className="font-headline-sm text-headline-sm text-primary">
                PER-YEAR DISCOUNTING
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                TIME-VALUE · ANNUITIZED FROM EFFECTIVE DATE
              </span>
            </div>
            <table className="w-full font-data-mono text-data-mono">
              <thead>
                <tr className="border-b-technical text-on-surface-variant">
                  <th className="text-left px-3 py-2 font-normal">YEAR</th>
                  <th className="text-right px-3 py-2 font-normal">DISCOUNT</th>
                  <th className="text-right px-3 py-2 font-normal">SAVE FRACTION</th>
                  <th className="text-right px-3 py-2 font-normal">RAW</th>
                  <th className="text-right px-3 py-2 font-normal">DISCOUNTED</th>
                </tr>
              </thead>
              <tbody>
                {npv.perYear.map((y) => (
                  <tr key={y.year} className="border-b border-outline last:border-b-0">
                    <td className="px-3 py-2 text-primary">Y{y.year}</td>
                    <td className="px-3 py-2 text-right">{fmt(y.discount)}</td>
                    <td className="px-3 py-2 text-right">
                      {y.saveFraction != null ? `${Math.round(y.saveFraction * 100)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{money(y.raw)}</td>
                    <td className="px-3 py-2 text-right text-primary">{money(y.discounted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Ledger receipt trail — the chain says why */}
      <div className="px-4 pb-4">
        <div className="border border-outline bg-surface-container-low p-3 flex flex-col gap-2">
          <span className="font-label-caps text-label-caps text-on-surface-variant border-b-technical pb-1">
            LEDGER RECEIPTS · {row.id}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {(row.receipts || []).map((rcpt) => (
              <span key={rcpt.sha} className="flex items-center gap-1.5" title={rcpt.sha}>
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  {KIND_LABEL[rcpt.kind] || rcpt.kind}
                </span>
                <span className="font-data-mono text-data-mono text-on-surface-variant bg-surface-variant border border-outline px-1.5 py-0.5">
                  {rcpt.short}
                </span>
              </span>
            ))}
          </div>
          {row.mandate && row.mandateCitation ? (
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              Mandate pin · {row.mandateCitation}
            </p>
          ) : null}
          {row.funding === "BENCHED" ? (
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              Benched: priority #{row.rank} lost to the capacity line — the receipt records
              capacity_at_decision, not an opinion.
            </p>
          ) : null}
          {row.funding === "HELD_DUPLICATE" ? (
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              Held: same outcome as a funded primary — duplicate build avoided before code.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── small presentational helpers ───────────────────────────────────────────
const KIND_LABEL = {
  INITIATIVE_INTAKEN: "Intake",
  DUPLICATE_FLAGGED: "Dedup",
  SCORED: "Score",
  PRIORITIZED: "Allocate",
  TIERED: "Tier",
  METHODOLOGY_PUBLISHED: "Publish",
};

function Cell({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-caps text-label-caps text-on-surface-variant border-b-technical pb-1">
        {label}
      </span>
      <span className="font-data-mono text-data-mono mt-1">{children}</span>
    </div>
  );
}

function KV({ k, v, strong = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-label-caps text-label-caps text-on-surface-variant">{k}</span>
      <span
        className={`font-data-mono text-data-mono text-right ${
          strong ? "text-primary font-semibold" : "text-on-surface-variant"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

function NpvLine({ k, v }) {
  const n = Number(v) || 0;
  const zero = n === 0;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={`font-label-caps text-label-caps ${zero ? "text-outline" : "text-on-surface-variant"}`}
      >
        {k}
      </span>
      <span
        className={`font-data-mono text-data-mono text-right ${
          zero ? "text-outline" : n < 0 ? "text-primary" : "text-secondary"
        }`}
      >
        {money(n)}
      </span>
    </div>
  );
}

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
}
function fmtInt(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Math.round(Number(n)).toLocaleString("en-US");
}
