"use client";

// AuditTerminal — the Stitch "SYSTEM AUDIT // LOG_TERMINAL" surface, wired to
// the REAL hash-chained ledger.
//
// Pixel-faithful to the audit verification log mock: the cursor-blink
// headline, the green "SYSTEM INTEGRITY: VERIFIED" badge (driven by live
// verify()), the filter bar (hash + kind), the terminal-log data table
// (grid-cols-[120px_180px_1fr_220px], hard 4px drop-shadow, hairline ink
// borders, crosshair rows), and the black terminal footer (LIVE STREAM_ACTIVE /
// ROWS n/n).
//
// Everything rendered here comes off the engine result the server page handed
// down — seq / kind / sha / prev / payload-summary for the chain, and the
// fully-resolved receipt index for the lookup. Nothing is recomputed. The
// filters and the expand/lookup interactions are presentational only; they
// never touch the chain or the verify() result.
//
// Stitch leans on a few utilities not in the compiled config (`text-error`, the
// grid background, the FILL'd icon, the brutalist square-corner reset). Those
// are reproduced inline as plain style/utility so the screen needs only the
// design system + Tailwind primitives — no CDN, no config edit.

import { useMemo, useState } from "react";

// The single status accent + the monochrome surrogates, matched to the legacy
// palette tokens so the green reads identically to the rest of the app.
const GREEN = "#196c42"; // colors.secondary
const ERROR = "#ba1a1a"; // Stitch text-error (refusal / override-grade events)

// ── value-coded tone → text color for the ACTION_VCTR cell ──────────────────
const TONE_TEXT = {
  green: { color: GREEN },
  ink: undefined, // inherits text-primary
  hold: { color: ERROR },
};

export default function AuditTerminal({
  events,
  kinds,
  receipts,
  refused,
  verify,
  head,
  methodologyVersion,
  stats,
}) {
  const ok = verify.ok;

  // ── filter state (presentational) ──────────────────────────────────────────
  const [hashQuery, setHashQuery] = useState("");
  const [activeKinds, setActiveKinds] = useState(
    () => new Set(kinds.map((k) => k.kind))
  );
  const [openSeq, setOpenSeq] = useState(null); // expanded row

  const toggleKind = (k) =>
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const allKindsOn = activeKinds.size === kinds.length;
  const showAllKinds = () => setActiveKinds(new Set(kinds.map((k) => k.kind)));

  const q = hashQuery.trim().toLowerCase().replace(/^0x/, "");
  const shown = useMemo(
    () =>
      events.filter((e) => {
        if (!activeKinds.has(e.kind)) return false;
        if (!q) return true;
        return (
          e.sha.toLowerCase().includes(q) ||
          (e.prev || "").toLowerCase().includes(q) ||
          (e.id || "").toLowerCase().includes(q) ||
          String(e.seq) === q
        );
      }),
    [events, activeKinds, q]
  );

  const brokeAt = ok ? null : verify.brokeAt;

  return (
    <main className="flex-1 w-full px-gutter md:px-margin py-margin">
      <div className="max-w-container-max mx-auto w-full flex flex-col">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-primary pb-4 mb-gutter">
          <div>
            <h1
              className="font-headline-lg text-headline-lg text-primary uppercase inline-flex items-center"
            >
              SYSTEM AUDIT // LOG_TERMINAL
              <span className="cursor-blink-cell" aria-hidden="true" />
            </h1>
            <p className="font-data-mono text-data-mono text-on-surface-variant mt-2 uppercase">
              Immutable record of priority state changes ·{" "}
              {methodologyVersion} · append-only SHA-256 chain
            </p>
          </div>
          <div
            className={`mt-4 md:mt-0 flex items-center gap-2 border border-primary px-3 py-2 shrink-0 ${
              ok ? "bg-secondary text-on-secondary" : "bg-primary text-on-primary"
            }`}
          >
            <span className="material-symbols-outlined icon-fill text-[18px]">
              {ok ? "verified" : "gpp_maybe"}
            </span>
            <span className="font-label-caps text-label-caps uppercase font-bold tracking-widest">
              {ok
                ? "SYSTEM INTEGRITY: VERIFIED"
                : `CHAIN BROKEN @ EVENT ${verify.brokeAt}`}
            </span>
          </div>
        </header>

        {/* ── Chain stat strip (real verify/head/counts) ───────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 technical-border bg-surface-container-lowest mb-gutter">
          <StatCell value={ok ? "OK" : "BROKEN"} label="verify()" green={ok} />
          <StatCell value={stats.total} label="chain events" />
          <StatCell value={stats.kinds} label="event kinds" />
          <StatCell value={stats.intake} label="intaken" />
          <StatCell value={stats.rejected} label="refused at door" />
          <StatCell value={stats.held} label="duplicates held" green />
        </section>

        {/* ── Filter / query bar ───────────────────────────────────────────── */}
        <section className="flex flex-col md:flex-row gap-4 mb-gutter bg-surface-container-high border border-primary p-2">
          <div className="flex-1 flex items-center gap-2 border border-primary bg-background px-3 py-1 focus-within:ring-1 focus-within:ring-primary">
            <span className="material-symbols-outlined text-primary text-[18px]">
              search
            </span>
            <input
              className="bg-transparent border-none outline-none w-full font-data-mono text-data-mono text-primary placeholder-on-surface-variant uppercase"
              placeholder="FILTER BY HASH [0x...] · ID · SEQ"
              type="text"
              value={hashQuery}
              onChange={(e) => setHashQuery(e.target.value)}
              spellCheck={false}
            />
            {hashQuery && (
              <button
                type="button"
                onClick={() => setHashQuery("")}
                className="material-symbols-outlined text-on-surface-variant text-[16px] hover:text-primary"
                aria-label="Clear hash filter"
              >
                close
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={showAllKinds}
            className="bg-primary text-on-primary border border-primary font-label-caps text-label-caps px-6 py-2 uppercase hover:bg-inverse-surface transition-colors shrink-0"
          >
            RESET FILTERS
          </button>
        </section>

        {/* ── Kind filter chips (ACTION_VCTR facets) ───────────────────────── */}
        <section className="flex flex-wrap items-center gap-2 mb-gutter">
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant mr-1">
            ACTION_VCTR
          </span>
          <FilterChip on={allKindsOn} onClick={showAllKinds} label="ALL" />
          {kinds.map((k) => (
            <FilterChip
              key={k.kind}
              on={activeKinds.has(k.kind)}
              onClick={() => toggleKind(k.kind)}
              label={`${k.label} · ${k.count}`}
            />
          ))}
        </section>

        {/* ── Data Table Container (Terminal Log) ──────────────────────────── */}
        <div className="border border-primary bg-background flex flex-col overflow-hidden relative shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          {/* Table Header Grid */}
          <div className="grid grid-cols-[64px_180px_1fr_200px] border-b-2 border-primary bg-surface-container-highest text-primary">
            <div className="p-2 font-label-caps text-label-caps uppercase border-r border-primary">
              SEQ
            </div>
            <div className="p-2 font-label-caps text-label-caps uppercase border-r border-primary">
              ACTION_VCTR
            </div>
            <div className="p-2 font-label-caps text-label-caps uppercase border-r border-primary">
              DECISION (PAYLOAD)
            </div>
            <div className="p-2 font-label-caps text-label-caps uppercase">
              RECEIPT_HASH
            </div>
          </div>

          {/* Table Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            {shown.map((e) => {
              const broken = brokeAt != null && e.seq === brokeAt;
              const isOpen = openSeq === e.seq;
              const toneStyle = TONE_TEXT[e.tone];
              const genesis = !e.prev;
              return (
                <div key={e.sha}>
                  {/* the log row */}
                  <button
                    type="button"
                    onClick={() => setOpenSeq(isOpen ? null : e.seq)}
                    className={`grid grid-cols-[64px_180px_1fr_200px] w-full text-left border-b border-primary transition-none group cursor-crosshair hover:bg-surface-variant ${
                      broken
                        ? "bg-error-container"
                        : isOpen
                        ? "bg-surface-container-low"
                        : ""
                    }`}
                  >
                    <div className="p-2 font-data-mono text-data-mono text-on-surface-variant border-r border-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                        {isOpen ? "expand_more" : "chevron_right"}
                      </span>
                      {String(e.seq).padStart(2, "0")}
                    </div>
                    <div
                      className="p-2 font-data-mono text-data-mono border-r border-primary font-bold flex items-center gap-1 truncate"
                      style={toneStyle}
                    >
                      <span className="truncate">{e.kindLabel}</span>
                      {e.mandate && (
                        <span className="material-symbols-outlined text-[13px]">
                          push_pin
                        </span>
                      )}
                    </div>
                    <div
                      className="p-2 font-data-mono text-data-mono border-r border-primary truncate group-hover:text-secondary flex items-center"
                      style={toneStyle}
                    >
                      {e.summary}
                    </div>
                    <div className="p-2 font-data-mono text-data-mono text-primary truncate flex items-center group-hover:underline">
                      0x{e.sha.slice(0, 16)}
                    </div>
                  </button>

                  {/* expanded detail — the hash-chain link (tamper-evidence) */}
                  {isOpen && (
                    <div className="border-b border-primary bg-surface-container-low px-2 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 font-data-mono text-data-mono">
                        <DetailRow
                          label="SHA · this receipt"
                          value={`0x${e.sha}`}
                          breakWord
                        />
                        <DetailRow
                          label="PREV · link"
                          value={genesis ? "— GENESIS (chain root) —" : `0x${e.prev}`}
                          breakWord
                          tone={genesis ? "muted" : undefined}
                        />
                        <DetailRow label="SEQ" value={String(e.seq)} />
                        <DetailRow label="KIND" value={e.kindLabel} />
                        {e.id && <DetailRow label="INITIATIVE" value={e.id} />}
                        <DetailRow label="PAYLOAD" value={e.summary} />
                      </div>
                      <p className="mt-3 font-data-mono text-[11px] text-on-surface-variant uppercase tracking-wide flex items-center gap-1 border-t border-outline-variant pt-2">
                        <span className="material-symbols-outlined text-[14px]">
                          {genesis ? "flag" : "link"}
                        </span>
                        {genesis
                          ? "First event — no predecessor. The chain begins here."
                          : "This event's PREV must equal the prior row's SHA. That continuity is the tamper-evidence verify() walks."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {shown.length === 0 && (
              <div className="p-6 text-center font-data-mono text-data-mono text-on-surface-variant uppercase">
                NO EVENTS MATCH THE CURRENT FILTER.
              </div>
            )}
          </div>

          {/* Terminal Footer */}
          <div className="border-t-2 border-primary bg-primary text-on-primary p-2 flex justify-between items-center font-data-mono text-data-mono">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">sync</span>
              <span className="uppercase">
                {ok ? "LIVE STREAM_ACTIVE · CHAIN INTACT" : "CHAIN BROKEN — RECORD UNTRUSTWORTHY"}
              </span>
            </div>
            <div className="uppercase">
              ROWS: {shown.length}/{stats.total} · HEAD 0x{head.slice(0, 8)}
            </div>
          </div>
        </div>

        {/* ── "Why was X benched?" — receipt lookup terminal ───────────────── */}
        <ReceiptConsole receipts={receipts} refused={refused} />
      </div>

      {/* cursor-blink for the headline + a couple of FILL utilities Stitch uses */}
      <style>{`
        .cursor-blink-cell::after {
          content: '_';
          margin-left: 4px;
          animation: looper-blink 1s step-end infinite;
          color: #000;
        }
        @keyframes looper-blink { 50% { opacity: 0; } }
        .icon-fill { font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24; }
      `}</style>
    </main>
  );
}

// ── chain stat cell (the technical-border strip) ─────────────────────────────
// The parent <section> carries `technical-border` (the outer box); each cell
// draws its own right + bottom hairline as the internal grid lines. The outer
// edges overlap the box border, so the strip reads as one ruled grid exactly
// like Stitch's board stat panels.
function StatCell({ value, label, green = false }) {
  return (
    <div className="p-3 border-r-technical border-b-technical">
      <div
        className={`font-headline-md text-headline-md leading-none tabular-nums ${
          green ? "text-secondary" : "text-primary"
        }`}
      >
        {value}
      </div>
      <div className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-2">
        {label}
      </div>
    </div>
  );
}

// ── ACTION_VCTR filter chip (square, ink, terminal feel) ─────────────────────
function FilterChip({ on, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-data-mono text-data-mono uppercase px-3 py-1 border border-primary transition-none ${
        on
          ? "bg-primary text-on-primary"
          : "bg-background text-on-surface-variant hover:bg-surface-variant"
      }`}
    >
      {label}
    </button>
  );
}

// ── expanded-row detail line ─────────────────────────────────────────────────
function DetailRow({ label, value, breakWord = false, tone }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
        {label}
      </span>
      <span
        className={`text-primary ${breakWord ? "break-all" : "truncate"} ${
          tone === "muted" ? "text-on-surface-variant" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ReceiptConsole — "WHY WAS X BENCHED?" — the receipt-lookup terminal panel.
// Resolve any intaken initiative to its decision receipt (rank / score / funding
// / capacity-at-decision / receipt trail), or show a refused-at-intake item that
// never reached the chain. Same terminal chrome as the log above.
// ════════════════════════════════════════════════════════════════════════════

const FUND_NOTE = {
  FUNDED: "Funded against capacity — it cleared the line.",
  BENCHED:
    "Below the capacity line: priority N+1 lost to priority N. Not disliked — out-ranked.",
  HELD_DUPLICATE:
    "Held behind a stronger primary with the same outcome — the org funds one build, not three.",
};

function ReceiptConsole({ receipts, refused }) {
  const [selected, setSelected] = useState(receipts[0]?.id ?? refused[0]?.id ?? "");

  const hit = receipts.find((r) => r.id === selected);
  const refusedHit = refused.find((r) => r.id === selected);

  return (
    <section className="mt-margin border border-primary bg-background flex flex-col overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)]">
      {/* console title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b-2 border-primary bg-surface-container-highest px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">
            help
          </span>
          <span className="font-headline-sm text-headline-sm text-primary uppercase">
            QUERY: WHY WAS X BENCHED?
          </span>
        </div>
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
          RECEIPT LOOKUP · {receipts.length} ON CHAIN · {refused.length} REFUSED
        </span>
      </div>

      {/* selector */}
      <div className="border-b border-primary bg-surface-container-low p-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[18px]">
          terminal
        </span>
        <span className="font-data-mono text-data-mono text-on-surface-variant uppercase shrink-0">
          RESOLVE&gt;
        </span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 bg-background border border-primary px-2 py-1 font-data-mono text-data-mono text-primary uppercase outline-none focus:ring-1 focus:ring-primary"
        >
          <optgroup label="ON THE CHAIN (INTAKEN)">
            {receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.title} —{" "}
                {r.funding === "FUNDED"
                  ? "FUNDED"
                  : r.funding === "BENCHED"
                  ? "BENCHED"
                  : "HELD"}{" "}
                (#{r.rank})
              </option>
            ))}
          </optgroup>
          {refused.length > 0 && (
            <optgroup label="REFUSED AT INTAKE (NEVER REACHED THE CHAIN)">
              {refused.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.title} — REFUSED
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* body */}
      <div className="p-gutter md:p-margin bg-background">
        {hit ? (
          <ReceiptReadout r={hit} />
        ) : refusedHit ? (
          <RefusedReadout r={refusedHit} />
        ) : null}
      </div>
    </section>
  );
}

function ReceiptReadout({ r }) {
  const benched = r.funding === "BENCHED";
  const held = r.funding === "HELD_DUPLICATE";
  const fundTone =
    r.funding === "FUNDED" ? "green" : held ? "hold" : "ink";

  return (
    <div className="flex flex-col gap-4">
      {/* identity row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-primary pb-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-data-mono text-data-mono text-primary font-bold border border-primary px-2 py-0.5">
              {r.id}
            </span>
            <Pill
              label={r.tier}
              green={r.tier === "Now"}
              icon={r.tier === "Now" ? "bolt" : undefined}
            />
            <Pill
              label={r.funding}
              green={r.funding === "FUNDED"}
              solid={held}
            />
            {r.mandate && <Pill label="MANDATE" icon="push_pin" />}
          </div>
          <h3 className="font-headline-sm text-headline-sm text-primary mt-2">
            {r.title}
          </h3>
          <p className="font-data-mono text-data-mono text-on-surface-variant uppercase mt-1">
            {r.area} · {r.valueType}
            {r.sponsor ? ` · ${r.sponsor}` : ""}
          </p>
        </div>
        {/* score block */}
        <div className="shrink-0 border border-primary px-4 py-3 bg-surface-container-low text-right">
          <div className="font-headline-lg text-headline-lg text-primary leading-none tabular-nums">
            {r.score}
          </div>
          <div className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-1">
            SCORE / 100
          </div>
          <div className="mt-2 h-2 w-28 border border-primary bg-surface-container-highest overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${Math.max(0, Math.min(100, r.score))}%`,
                backgroundColor: GREEN,
              }}
            />
          </div>
        </div>
      </div>

      {/* THE DECISION — the plain-language verdict */}
      <div
        className={`border-l-4 border border-primary p-3 ${
          fundTone === "green"
            ? "border-l-secondary bg-secondary-container"
            : fundTone === "hold"
            ? "border-l-primary bg-surface-container-high"
            : "border-l-outline bg-surface-container-low"
        }`}
      >
        <div className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">
          THE DECISION
        </div>
        <p className="font-body-md text-body-md text-on-surface m-0">
          {FUND_NOTE[r.funding]}
          {held && r.heldNote ? ` ${r.heldNote}` : ""}
        </p>
      </div>

      {/* the receipt rows — the reproducible numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 technical-border">
        <ReceiptRow label="Global rank" value={`#${r.rank}`} />
        <ReceiptRow label="Display score" value={`${r.score} / 100`} />
        <ReceiptRow label="Funding outcome" value={r.funding} green={r.funding === "FUNDED"} />
        <ReceiptRow label="Tier" value={r.tier} green={r.tier === "Now"} />
        <ReceiptRow
          label="Capacity at decision"
          value={`${r.capacityUsed}/${r.capacityAtDecision} teams used`}
        />
        <ReceiptRow label="Teams this item asks" value={`${r.teams}`} />
        {benched && (
          <ReceiptRow
            label="Why benched (the number)"
            value={`${r.capacityUsed}/${r.capacityAtDecision} already committed when #${r.rank} came up`}
            wide
          />
        )}
        <ReceiptRow label="3-yr NPV impact" value={r.npvMoney} />
        <ReceiptRow label="Methodology version" value={r.methodologyVersion} />
      </div>

      {/* receipt trail — every chain event this id touched */}
      <div>
        <div className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">link</span>
          RECEIPT TRAIL — EVERY EVENT THIS ID TOUCHED
        </div>
        <div className="border border-primary divide-y divide-outline-variant">
          {r.events.map((e) => (
            <div
              key={e.sha}
              className="grid grid-cols-[40px_1fr_auto] items-center gap-2 px-2 py-1.5 font-data-mono text-data-mono hover:bg-surface-variant"
            >
              <span className="text-on-surface-variant">
                {String(e.seq).padStart(2, "0")}
              </span>
              <span className="text-primary font-bold uppercase truncate">
                {e.kindLabel}
              </span>
              <span className="text-on-surface-variant truncate">
                0x{e.sha.slice(0, 16)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RefusedReadout({ r }) {
  return (
    <div
      className="border-2 border-primary p-4"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, #faf9f5, #faf9f5 8px, #eeeeea 8px, #eeeeea 16px)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ color: ERROR }}
        >
          block
        </span>
        <span
          className="font-label-caps text-label-caps uppercase font-bold tracking-wide"
          style={{ color: ERROR }}
        >
          REFUSED AT INTAKE — NO RECEIPT ON THE CHAIN
        </span>
      </div>
      <div className="font-data-mono text-data-mono text-primary font-bold mb-2 uppercase">
        {r.id} · {r.title}
      </div>
      <p className="font-body-md text-body-md text-on-surface mb-3">
        This submission never entered the queue, so there is no ranking receipt
        to look up. &ldquo;If it&rsquo;s not in the system, it doesn&rsquo;t
        exist.&rdquo; The door rejected it for:
      </p>
      <ul className="m-0 flex flex-col gap-1">
        {r.errors.map((err, i) => (
          <li
            key={i}
            className="font-data-mono text-data-mono text-on-surface-variant flex items-start gap-2"
          >
            <span
              className="material-symbols-outlined text-[14px] mt-0.5"
              style={{ color: ERROR }}
            >
              chevron_right
            </span>
            {err}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── receipt readout row (label left, mono value right) ───────────────────────
// Parent grid carries `technical-border` (outer box); each row draws a bottom +
// right hairline as the internal rules. Edge hairlines overlap the box border,
// so the panel reads as one cleanly ruled receipt.
function ReceiptRow({ label, value, green = false, wide = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 border-b-technical border-r-technical ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
        {label}
      </span>
      <span
        className={`font-data-mono text-data-mono tabular-nums text-right ${
          green ? "text-secondary font-bold" : "text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ── status pill (Now / FUNDED carry the green accent; rest monochrome) ───────
function Pill({ label, green = false, solid = false, icon }) {
  const cls = green
    ? "bg-secondary-container text-on-secondary-container border-secondary"
    : solid
    ? "bg-primary text-on-primary border-primary"
    : "bg-background text-on-surface-variant border-outline";
  return (
    <span
      className={`inline-flex items-center gap-1 font-label-caps text-label-caps uppercase px-2 py-0.5 border ${cls}`}
    >
      {icon && <span className="material-symbols-outlined text-[13px]">{icon}</span>}
      {label}
    </span>
  );
}
