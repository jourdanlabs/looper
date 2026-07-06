"use client";

// BoardClient — the interactive prioritization queue. (Stitch reskin.)
//
// Receives a fully-computed, serialized engine slice from the server page (it
// never calls the engine itself — the engine uses node:crypto and is server
// only). Responsibilities are purely view-state:
//   • filter chips by business impact (ALL / PARTNER / CONSUMER / PLATFORM)
//   • the tiered queue NOW…COLD, one section per non-empty tier
//   • expand any row to its score-breakdown receipt + ledger trail
//   • the dedup-hold callout, the refused-at-intake list, and the chain-replayed
//     markdown export
//
// Every number on screen comes straight from the engine result; this file adds
// no scoring/tiering logic of its own. The markup is the Stitch board
// (filter chips + tier sections + initiative articles) rendering real data.

import { useMemo, useState } from "react";
import InitiativeRow from "./InitiativeRow.jsx";

// Stitch tier section order + the caption that sits beside the tier heading.
const TIER_ORDER = ["Now", "Next", "Later", "Watchlist", "Cold", "Archived"];
const TIER_CAPTION = {
  Now: "FUNDED AGAINST CAPACITY",
  Next: "QUEUED FOR CAPACITY",
  Later: "BENCHED THIS CYCLE",
  Watchlist: "HELD & PARKED",
  Cold: "NO CASE YET",
  Archived: "CLOSED OUT",
};

// The three business-impact channels, exactly the Stitch chip set (+ ALL).
const IMPACTS = ["Partner", "Consumer", "Platform"];

// Chip class strings are byte-identical to the Stitch board markup: the active
// chip is the inverted ink fill, the inactive ones are ghost outlines.
const CHIP_ON =
  "bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 hover:bg-surface-variant hover:text-primary transition-colors border border-primary";
const CHIP_OFF =
  "bg-transparent text-primary font-label-caps text-label-caps px-4 py-2 hover:bg-primary hover:text-on-primary transition-colors border border-primary";

export default function BoardClient({ rows, clusters, rejected = [], brief, head }) {
  const [impact, setImpact] = useState("All");
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  // Outcome lookup for held duplicates: member id → { outcome, primary, count }.
  // The held-row subline ("N duplicates held — 'outcome'") reads from this, so
  // the phrasing is driven by the real dedup clusters, not a hardcoded string.
  const dedupByMember = useMemo(() => {
    const m = {};
    for (const c of clusters || []) {
      for (const id of c.members) {
        m[id] = { outcome: c.outcome, primary: c.primary, heldCount: c.duplicates.length };
      }
    }
    return m;
  }, [clusters]);

  // Filter by business impact (the readout axis). The chip counts are live.
  const counts = useMemo(() => {
    const c = { All: rows.length };
    for (const i of IMPACTS) c[i] = rows.filter((r) => r.impact === i).length;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (impact === "All" ? rows : rows.filter((r) => r.impact === impact)),
    [rows, impact]
  );

  // Bucket the visible rows by tier, preserving the engine's global rank order.
  const byTier = useMemo(() => {
    const m = {};
    for (const t of TIER_ORDER) m[t] = [];
    for (const r of [...visible].sort((a, b) => a.rank - b.rank)) {
      (m[r.tier] || (m[r.tier] = [])).push(r);
    }
    return m;
  }, [visible]);

  const CHIPS = [
    { key: "All", label: "ALL", count: counts.All },
    ...IMPACTS.map((i) => ({ key: i, label: i.toUpperCase(), count: counts[i] })),
  ];

  return (
    <div className="flex flex-col gap-margin">
      {/* ── Filter chips (wired to real business-impact filtering) ──────────── */}
      <div className="flex flex-wrap gap-2 items-center" data-tour="filters">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setImpact(c.key)}
            aria-pressed={impact === c.key}
            className={impact === c.key ? CHIP_ON : CHIP_OFF}
          >
            {c.label} · {c.count}
          </button>
        ))}
        <span className="font-data-mono text-data-mono text-on-surface-variant ml-auto">
          {visible.length} OF {rows.length} · CLICK A ROW FOR ITS RECEIPT
        </span>
      </div>

      {/* ── Queue Tiers ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6" data-tour="queue">
        {TIER_ORDER.map((tier) => {
          const items = byTier[tier] || [];
          if (!items.length) return null;
          return (
            <section key={tier} className="flex flex-col gap-0">
              <div className="border-b-2 border-primary pb-2 mb-3 flex items-baseline gap-4">
                <h2 className="font-headline-md text-headline-md text-primary">
                  {tier.toUpperCase()}
                </h2>
                <span className="font-data-mono text-data-mono text-on-surface-variant">
                  {TIER_CAPTION[tier]}
                </span>
                <span className="font-data-mono text-data-mono text-outline ml-auto">
                  {items.length} ITEM{items.length === 1 ? "" : "S"}
                </span>
              </div>
              {items.map((row) => (
                <InitiativeRow
                  key={row.id}
                  row={row}
                  dedup={dedupByMember[row.id]}
                  open={openId === row.id}
                  onToggle={() => toggle(row.id)}
                />
              ))}
            </section>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="technical-border bg-surface-container-lowest p-4 font-data-mono text-data-mono text-on-surface-variant">
          <span className="font-label-caps text-label-caps text-primary block mb-1">
            NO INITIATIVES
          </span>
          No funded or benched work maps to {impact}. Clear the filter to see the full queue.
        </div>
      ) : null}

      {/* ── Duplicate-build gate — the "third calculator" hold, made visible ─── */}
      {clusters && clusters.length ? (
        <section className="technical-border bg-surface-container-lowest" data-tour="dedup">
          <div className="p-4 border-b-technical bg-surface-container-low flex items-baseline justify-between gap-4">
            <h3 className="font-headline-sm text-headline-sm text-primary">DUPLICATE-BUILD GATE</h3>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              HELD BEFORE CAPACITY SPENT
            </span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              The engine clusters by outcome, funds the strongest, and holds the rest — so the org
              builds one calculator, not three at a million dollars each.
            </p>
            {clusters.map((c) => (
              <div
                key={c.outcome}
                className="border border-outline bg-surface-container-low p-3 flex flex-col gap-2"
              >
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <span className="font-data-mono text-data-mono text-primary">
                    Outcome &lsquo;{c.outcome}&rsquo; proposed by {c.members.length} areas
                  </span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    {c.duplicates.length} HELD
                  </span>
                </div>
                <div className="font-data-mono text-data-mono text-on-surface-variant flex items-center gap-2 flex-wrap">
                  <span>FUND</span>
                  <span className="text-primary">{c.primary}</span>
                  <span>· HOLD</span>
                  {c.duplicates.map((d, i) => (
                    <span key={d} className="text-outline">
                      {i > 0 ? ", " : ""}
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Refused at intake (CADMUS refusal) ──────────────────────────────── */}
      {rejected && rejected.length ? (
        <section className="technical-border bg-surface-container-lowest" data-tour="refused">
          <div className="p-4 border-b-technical bg-surface-container-low flex items-baseline justify-between gap-4">
            <h3 className="font-headline-sm text-headline-sm text-primary">REFUSED AT INTAKE</h3>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              UNSTRUCTURED / UNSOURCED
            </span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              A real prioritization system refuses the napkin. These never entered the queue —
              structure and evidence are enforced at submission, not patched up at review.
            </p>
            {rejected.map((rej) => (
              <div
                key={rej.id}
                className="border border-primary border-dashed bg-surface-variant p-3 flex flex-col gap-2"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-data-mono text-data-mono text-primary">
                    <span className="text-outline">{rej.id}</span> · {rej.title}
                  </span>
                  <span className="font-label-caps text-label-caps text-error">REFUSED</span>
                </div>
                <ul className="font-data-mono text-data-mono text-on-surface-variant list-disc pl-5 flex flex-col gap-0.5">
                  {rej.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {(rej.missingEvidence || []).map((m, i) => (
                    <li key={`ev-${i}`}>missing evidence: {m.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Markdown export — replayed from the chain, never hand-edited ─────── */}
      {brief ? (
        <section className="technical-border bg-surface-container-lowest" data-tour="readout">
          <div className="p-4 border-b-technical bg-surface-container-low flex items-baseline justify-between gap-4 flex-wrap">
            <h3 className="font-headline-sm text-headline-sm text-primary">
              LOOPER READOUT · MARKDOWN EXPORT
            </h3>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              REGENERATED FROM CHAIN · HEAD {head}
            </span>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <p className="font-data-mono text-data-mono text-on-surface-variant">
              Paste into LOOPER / Loop / SharePoint. It is not hand-edited — it is replayed from
              the ledger, so it stays true to the system of record.
            </p>
            <pre className="font-data-mono text-data-mono leading-relaxed text-on-surface-variant bg-surface-container-low border border-outline p-4 whitespace-pre-wrap overflow-x-auto">
              {brief}
            </pre>
          </div>
        </section>
      ) : null}
    </div>
  );
}
