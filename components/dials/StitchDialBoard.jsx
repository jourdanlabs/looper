"use client";

// StitchDialBoard — the Dial Board (§6) reskinned to the Stitch "System Dials"
// design, wired to the REAL engine.
//
// Client-only: it owns the slider state and the publish flow, and it NEVER
// imports the engine (node:crypto is server-only). All scoring happens
// server-side through the two existing route handlers:
//
//   • every dial move  → POST /dials/preview  → preview() (SANDBOX, no chain)
//   • Deploy (gated)   → POST /dials/publish  → publish() (chain + version bump)
//
// The Stitch markup gives us: hard 1px ink panels, the segmented-bar dial
// (ten cells, filled to the dial's position in its range), a right-hand logic +
// change-log rail, and the green DEPLOY button. We keep Stitch's structure and
// classes exactly; the numbers, the bar fills, the change log, and the deploy
// flow are all real engine output — no placeholder values.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  R_RANGE,
  HORIZON_RANGE,
  CONF_RANGE,
  WEIGHT_RANGE,
  VALUE_TYPE_CAPTION,
  APPROVERS,
  APPROVAL_THRESHOLD,
  pct,
} from "./dialMeta.js";

// Material Symbol icon per value-type lever, matched to Stitch's dial icons.
const VALUE_TYPE_ICON = {
  "Direct Customer Revenue": "payments",
  "Direct Customer Service": "support_agent",
  "Internal Enabler": "build",
  "Risk-Compliance": "verified_user",
  "Strategic-Optionality": "hub",
};

// The number of segmented cells in a Stitch dial bar.
const CELLS = 10;

// ── helpers ──────────────────────────────────────────────────────────────────
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;

function dialsFromDefaults(defaults, valueTypeList) {
  const weights = {};
  for (const vt of valueTypeList) weights[vt] = defaults.valueTypeWeights[vt];
  return {
    valueTypeWeights: weights,
    r: defaults.r,
    horizon: defaults.horizon,
    confidenceSensitivity: defaults.confidenceSensitivity,
  };
}

function dialsEqual(a, b, valueTypeList) {
  if (r3(a.r) !== r3(b.r)) return false;
  if (Math.round(a.horizon) !== Math.round(b.horizon)) return false;
  if (r3(a.confidenceSensitivity) !== r3(b.confidenceSensitivity)) return false;
  for (const vt of valueTypeList) {
    if (r3(a.valueTypeWeights[vt]) !== r3(b.valueTypeWeights[vt])) return false;
  }
  return true;
}

// Map a value within [min,max] to a count of filled cells out of CELLS.
function filledCells(value, { min, max }) {
  const span = max - min;
  if (span <= 0) return 0;
  const frac = (Number(value) - min) / span;
  return Math.max(0, Math.min(CELLS, Math.round(frac * CELLS)));
}

function bumpLocal(v) {
  const m = /^v(\d+)\.(\d+)$/.exec(String(v));
  if (!m) return "v1.1";
  return `v${m[1]}.${Number(m[2]) + 1}`;
}

function fmtDelta(d) {
  if (d === null || d === undefined) return "—";
  if (d === 0) return "0";
  return d > 0 ? `+${d}` : `${d}`;
}

export default function StitchDialBoard({
  valueTypeList,
  defaultDials, // engine-resolved DEFAULT_DIALS (the published baseline)
  baseline, // [{ id, rank, score, funding, dedup }] under published dials
  titles, // { [id]: { title, valueType, area } }
  initialVersion, // "v1.0"
  head, // string sha of the live chain head
}) {
  const published = useMemo(
    () => dialsFromDefaults(defaultDials, valueTypeList),
    [defaultDials, valueTypeList]
  );

  // The committee's working/proposed dials (what the sliders edit).
  const [dials, setDials] = useState(() => dialsFromDefaults(defaultDials, valueTypeList));

  // Sandbox preview result from the server (null until first run).
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState(false);
  const [previewErr, setPreviewErr] = useState(null);

  // Publish flow.
  const [version, setVersion] = useState(initialVersion);
  const [showPublish, setShowPublish] = useState(false);
  const [why, setWhy] = useState("");
  const [who, setWho] = useState(APPROVERS[0].id);
  const [approvals, setApprovals] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishErr, setPublishErr] = useState(null);
  const [published_, setPublished] = useState(null);
  const [ledgerLocked, setLedgerLocked] = useState(false);

  const modified = useMemo(
    () => !dialsEqual(dials, published, valueTypeList),
    [dials, published, valueTypeList]
  );

  // ── sandbox preview: debounce dial changes, POST to /dials/preview ─────────
  const reqId = useRef(0);
  const runPreview = useCallback(
    async (proposed) => {
      const id = ++reqId.current;
      setPending(true);
      setPreviewErr(null);
      try {
        const res = await fetch("/dials/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentDials: published, proposedDials: proposed, capacity: 12 }),
        });
        if (!res.ok) throw new Error(`preview ${res.status}`);
        const data = await res.json();
        if (id === reqId.current) setPreview(data);
      } catch (e) {
        if (id === reqId.current) setPreviewErr(String(e.message || e));
      } finally {
        if (id === reqId.current) setPending(false);
      }
    },
    [published]
  );

  useEffect(() => {
    const t = setTimeout(() => runPreview(dials), 120);
    return () => clearTimeout(t);
  }, [dials, runPreview]);

  // ── dial setters ───────────────────────────────────────────────────────────
  const setWeight = (vt, v) =>
    setDials((d) => ({ ...d, valueTypeWeights: { ...d.valueTypeWeights, [vt]: Number(v) } }));
  const setScalar = (key, v) => setDials((d) => ({ ...d, [key]: Number(v) }));
  const resetDials = () => setDials(dialsFromDefaults(defaultDials, valueTypeList));

  // ── publish ────────────────────────────────────────────────────────────────
  const toggleApproval = (id) =>
    setApprovals((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const canPublish =
    modified &&
    why.trim().length > 0 &&
    approvals.length >= APPROVAL_THRESHOLD &&
    !publishing &&
    !ledgerLocked;

  const doPublish = async () => {
    setPublishing(true);
    setPublishErr(null);
    try {
      const res = await fetch("/dials/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDials: published,
          proposedDials: dials,
          currentVersion: version,
          who,
          why,
          approvals,
          capacity: 12,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `publish ${res.status}`);
      setPublished(data);
      setVersion(data.version);
      setShowPublish(false);
      setWhy("");
      setApprovals([]);
      setLedgerLocked(true);
    } catch (e) {
      setPublishErr(String(e.message || e));
    } finally {
      setPublishing(false);
    }
  };

  // Derived view: join preview deltas with titles, sorted by the new rank.
  const rows = useMemo(() => {
    if (!preview) return [];
    return preview.deltas
      .map((d) => ({ ...d, ...(titles[d.id] || {}) }))
      .sort((a, b) => a.rankAfter - b.rankAfter);
  }, [preview, titles]);

  const movers = useMemo(
    () => rows.filter((r) => r.delta !== 0 && r.delta !== null),
    [rows]
  );
  const flips = useMemo(
    () => rows.filter((r) => r.fundingBefore !== r.fundingAfter),
    [rows]
  );
  const summary = preview?.summary;

  const nextVersion = bumpLocal(version);
  const headShort = (published_?.head || head || "").slice(0, 8).toUpperCase();

  return (
    <>
      {/* ── PUBLISHED banner (after a real deploy) ──────────────────────────── */}
      {ledgerLocked && published_ && <PublishedBanner data={published_} />}

      {/* ── Header panel (Stitch) — real version + live chain state ─────────── */}
      <header className="technical-border bg-surface p-margin flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary uppercase">System Dials</h1>
          <div className="font-data-mono text-data-mono text-on-surface-variant mt-2 flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 ${modified ? "bg-primary" : "bg-secondary"}`}
            ></span>
            METHODOLOGY {version} // {modified ? "SANDBOX · PROPOSED" : "PUBLISHED · LIVE"}
          </div>
        </div>
        <div className="hidden md:block font-data-mono text-data-mono text-primary text-right">
          CHAIN HEAD: {headShort || "—"}
          <br />
          {pending ? "RE-RANKING…" : `${rows.length} INITIATIVES RANKED`}
        </div>
      </header>

      {/* ── Sandbox stat strip (Stitch grid-panel idiom) — real preview ────── */}
      <div className="technical-border bg-surface grid grid-cols-2 md:grid-cols-4 divide-x divide-primary">
        <SbStat n={summary ? summary.movedCount : 0} label="ranks moved" />
        <SbStat
          n={summary ? summary.flippedCount : 0}
          label="funding flips"
          green={!!(summary && summary.flippedCount)}
        />
        <SbStat
          n={summary && summary.biggestMover ? fmtDelta(summary.biggestMover.delta) : "—"}
          label="biggest mover"
        />
        <SbStat n={modified ? "OFF-CHAIN" : "PUBLISHED"} label="state" />
      </div>

      {/* ── Configuration grid (Stitch 12-col) ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left column: the dials (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-unit">
          {/* Value-type weights — the 5 strategic levers */}
          {valueTypeList.map((vt) => (
            <WeightDial
              key={vt}
              label={vt}
              icon={VALUE_TYPE_ICON[vt] || "tune"}
              caption={VALUE_TYPE_CAPTION[vt]}
              value={dials.valueTypeWeights[vt]}
              baseline={published.valueTypeWeights[vt]}
              onChange={(v) => setWeight(vt, v)}
              disabled={ledgerLocked}
            />
          ))}

          {/* NPV & confidence scalar dials */}
          <ScalarDial
            label="Discount rate r"
            icon="trending_down"
            caption="Firm cost of capital used to discount the 3-yr NPV."
            value={dials.r}
            baseline={published.r}
            range={R_RANGE}
            readout={pct(dials.r, 1)}
            baselineReadout={pct(published.r, 1)}
            onChange={(v) => setScalar("r", v)}
            disabled={ledgerLocked}
          />
          <ScalarDial
            label="NPV horizon H"
            icon="calendar_month"
            caption="Years of cash flow summed into Impact."
            value={dials.horizon}
            baseline={published.horizon}
            range={HORIZON_RANGE}
            readout={`${Math.round(dials.horizon)} YR`}
            baselineReadout={`${Math.round(published.horizon)} yr`}
            onChange={(v) => setScalar("horizon", v)}
            disabled={ledgerLocked}
          />
          <ScalarDial
            label="Confidence sensitivity"
            icon="verified"
            caption=">1 punishes low-confidence harder; <1 softens it."
            value={dials.confidenceSensitivity}
            baseline={published.confidenceSensitivity}
            range={CONF_RANGE}
            readout={`${Number(dials.confidenceSensitivity).toFixed(2)}×`}
            baselineReadout={`${Number(published.confidenceSensitivity).toFixed(2)}×`}
            onChange={(v) => setScalar("confidenceSensitivity", v)}
            disabled={ledgerLocked}
          />
        </div>

        {/* Right column: logic + change log (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-gutter h-full">
          {/* Sandbox logic panel — the live before/after re-rank */}
          <div className="technical-border bg-surface flex flex-col">
            <div className="p-3 border-b-technical bg-surface-container flex justify-between items-center">
              <h3 className="font-label-caps text-label-caps text-primary">SANDBOX RE-RANK</h3>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "16px" }}>
                {pending ? "sync" : "science"}
              </span>
            </div>
            <div className="p-gutter flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "300px" }}>
              {previewErr && (
                <div className="technical-border p-2 bg-surface-bright font-data-mono text-data-mono text-error">
                  SANDBOX ERROR · {previewErr}
                </div>
              )}
              {rows.length === 0 && !previewErr && (
                <div className="font-data-mono text-data-mono text-on-surface-variant">
                  Running first sandbox pass…
                </div>
              )}
              {rows.map((row) => {
                const held = row.dedup === "DUPLICATE";
                return (
                  <div
                    key={row.id}
                    className={`technical-border p-2 flex justify-between items-start gap-2 ${
                      held ? "bg-surface-container" : "bg-surface-bright"
                    }`}
                  >
                    <div className="font-data-mono text-data-mono text-primary flex flex-col min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-on-surface-variant">#{row.rankAfter}</span>
                        <span className="font-bold">{row.id}</span>
                      </span>
                      <span
                        className="text-on-surface-variant truncate"
                        style={{ fontSize: "10px", maxWidth: "190px" }}
                      >
                        {row.title || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <DeltaTag delta={row.delta} />
                      <FundingTag before={row.fundingBefore} after={row.fundingAfter} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change-log panel — real movers under the proposed dials */}
          <div className="technical-border bg-surface flex flex-col flex-1">
            <div className="p-3 border-b-technical bg-surface-container flex justify-between items-center">
              <h3 className="font-label-caps text-label-caps text-primary">PROPOSED LOGIC DELTA</h3>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "16px" }}>
                history
              </span>
            </div>
            <div className="p-gutter flex flex-col gap-unit overflow-y-auto" style={{ maxHeight: "240px" }}>
              {movers.length === 0 && (
                <div className="font-data-mono text-on-surface-variant" style={{ fontSize: "10px" }}>
                  {modified
                    ? "Proposed dials move no ranks yet."
                    : "Dials at the published baseline. Move a lever to preview the delta."}
                </div>
              )}
              {movers.slice(0, 8).map((m) => (
                <div
                  key={m.id}
                  className="technical-border p-2 bg-surface-bright flex justify-between items-start"
                >
                  <div className="font-data-mono text-data-mono text-primary flex flex-col min-w-0">
                    <span className="font-bold">{m.id}</span>
                    <span className="text-on-surface-variant truncate" style={{ fontSize: "10px", maxWidth: "150px" }}>
                      {m.title}
                    </span>
                  </div>
                  <div
                    className={`font-data-mono text-right ${m.delta > 0 ? "text-secondary" : "text-primary"}`}
                    style={{ fontSize: "10px" }}
                  >
                    {m.delta > 0 ? `▲ UP ${m.delta}` : `▼ DOWN ${Math.abs(m.delta)}`}
                    {m.fundingBefore !== m.fundingAfter && (
                      <>
                        <br />
                        {String(m.fundingAfter).toLowerCase().replace("_", " ")}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t-technical p-gutter flex items-center justify-between gap-2 mt-auto">
              <span className="font-data-mono text-on-surface-variant" style={{ fontSize: "10px" }}>
                {modified ? "SANDBOX · OFF-CHAIN" : "PUBLISHED · ON-CHAIN"}
              </span>
              <button
                type="button"
                className="font-label-caps text-label-caps text-primary border-b border-primary hover:text-secondary hover:border-secondary disabled:opacity-40 transition-none"
                onClick={resetDials}
                disabled={!modified || ledgerLocked}
              >
                RESET TO PUBLISHED
              </button>
            </div>
          </div>

          {/* DEPLOY button (Stitch) — opens the real publish flow */}
          <button
            type="button"
            className="w-full technical-border bg-secondary-container text-on-secondary-container p-4 font-headline-sm text-headline-sm uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-none flex justify-center items-center gap-2 disabled:opacity-40 disabled:hover:bg-secondary-container disabled:hover:text-on-secondary-container"
            onClick={() => {
              setPublishErr(null);
              setShowPublish(true);
            }}
            disabled={!modified || ledgerLocked}
          >
            <span className="material-symbols-outlined">publish</span>
            DEPLOY NEW WEIGHTS
          </button>
        </div>
      </div>

      {showPublish && (
        <PublishModal
          why={why}
          setWhy={setWhy}
          who={who}
          setWho={setWho}
          approvals={approvals}
          toggleApproval={toggleApproval}
          fromVersion={version}
          nextVersion={nextVersion}
          summary={summary}
          err={publishErr}
          publishing={publishing}
          canPublish={canPublish}
          onCancel={() => setShowPublish(false)}
          onPublish={doPublish}
        />
      )}
    </>
  );
}

// ── Dial component (Stitch segmented-bar idiom) ──────────────────────────────

function DialShell({ icon, label, caption, readout, baselineReadout, changed, children }) {
  return (
    <div className="technical-border bg-surface p-gutter flex flex-col gap-4">
      <div className="flex justify-between items-center border-b-technical pb-2 gap-3">
        <div className="font-label-caps text-label-caps text-primary flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: "18px" }}>
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </div>
        <div className="font-headline-md text-headline-md text-primary whitespace-nowrap flex items-baseline gap-2">
          {readout}
          {changed && (
            <span className="font-data-mono text-data-mono text-on-surface-variant">
              ← {baselineReadout}
            </span>
          )}
        </div>
      </div>
      {caption && (
        <div className="font-data-mono text-data-mono text-on-surface-variant -mt-2">{caption}</div>
      )}
      {children}
    </div>
  );
}

function SegmentBar({ filled }) {
  return (
    <div className="flex gap-1 h-8" aria-hidden="true">
      {Array.from({ length: CELLS }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 technical-border ${i < filled ? "bg-primary" : "bg-surface-container"}`}
        ></div>
      ))}
    </div>
  );
}

function WeightDial({ label, icon, caption, value, baseline, onChange, disabled }) {
  const changed = r3(value) !== r3(baseline);
  const filled = filledCells(value, WEIGHT_RANGE);
  return (
    <DialShell
      icon={icon}
      label={label.toUpperCase()}
      caption={caption}
      readout={`${Number(value).toFixed(2)}×`}
      baselineReadout={`${Number(baseline).toFixed(2)}×`}
      changed={changed}
    >
      <SegmentBar filled={filled} />
      <input
        className="w-full appearance-none h-1 bg-primary cursor-pointer accent-secondary disabled:opacity-40"
        type="range"
        min={WEIGHT_RANGE.min}
        max={WEIGHT_RANGE.max}
        step={WEIGHT_RANGE.step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={`${label} weight`}
      />
    </DialShell>
  );
}

function ScalarDial({ label, icon, caption, value, baseline, range, readout, baselineReadout, onChange, disabled }) {
  const changed = r3(value) !== r3(baseline);
  const filled = filledCells(value, range);
  return (
    <DialShell
      icon={icon}
      label={label.toUpperCase()}
      caption={caption}
      readout={readout}
      baselineReadout={baselineReadout}
      changed={changed}
    >
      <SegmentBar filled={filled} />
      <input
        className="w-full appearance-none h-1 bg-primary cursor-pointer accent-secondary disabled:opacity-40"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
      />
    </DialShell>
  );
}

// ── small inline tags for the sandbox rail ───────────────────────────────────

function DeltaTag({ delta }) {
  if (delta === null || delta === undefined)
    return (
      <span className="font-data-mono text-on-surface-variant" style={{ fontSize: "10px" }}>
        NEW
      </span>
    );
  if (delta === 0)
    return (
      <span className="font-data-mono text-on-surface-variant" style={{ fontSize: "10px" }}>
        —
      </span>
    );
  return (
    <span
      className={`font-data-mono ${delta > 0 ? "text-secondary" : "text-primary"}`}
      style={{ fontSize: "10px" }}
    >
      {delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
    </span>
  );
}

const FUND_LABEL = { FUNDED: "FUNDED", BENCHED: "BENCHED", HELD_DUPLICATE: "HELD · DUP" };

function FundingTag({ before, after }) {
  const isFunded = after === "FUNDED";
  const flipped = before !== after;
  return (
    <span
      className={`font-label-caps inline-flex items-center px-1.5 py-0.5 technical-border whitespace-nowrap ${
        isFunded ? "bg-secondary-container text-on-secondary-container" : "bg-surface text-on-surface-variant"
      }`}
      style={{ fontSize: "9px", letterSpacing: "0.08em" }}
      title={flipped ? `was ${String(before || "—").toLowerCase()}` : undefined}
    >
      {flipped && <span className="text-secondary mr-1">●</span>}
      {FUND_LABEL[after] || after}
    </span>
  );
}

// ── publish modal (Stitch panel chrome, real governance gate) ────────────────

function PublishModal({
  why,
  setWhy,
  who,
  setWho,
  approvals,
  toggleApproval,
  fromVersion,
  nextVersion,
  summary,
  err,
  publishing,
  canPublish,
  onCancel,
  onPublish,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-primary/45 flex items-start justify-center p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Deploy methodology change"
    >
      <div className="w-full max-w-[560px] bg-surface technical-border" style={{ borderWidth: "2px" }}>
        <div className="p-gutter border-b-technical bg-surface-container flex justify-between items-center">
          <h3 className="font-headline-sm text-headline-sm text-primary uppercase">Deploy methodology change</h3>
          <span className="font-data-mono text-data-mono text-primary">
            {fromVersion} → {nextVersion}
          </span>
        </div>

        <div className="p-margin flex flex-col gap-4">
          <div className="technical-border bg-surface-bright p-3">
            <div className="font-label-caps text-label-caps text-primary mb-1">WHAT THIS WRITES TO THE CHAIN</div>
            <p className="font-data-mono text-data-mono text-on-surface-variant m-0 leading-relaxed">
              A <span className="text-primary">METHODOLOGY_PUBLISHED</span> event — who, when,
              before/after rank delta, and your required reason. The version bumps to{" "}
              <span className="text-primary">{nextVersion}</span> and every score thereafter carries that stamp.
              {summary && (
                <>
                  {" "}
                  This change moves <span className="text-primary">{summary.movedCount}</span> rank
                  {summary.movedCount === 1 ? "" : "s"} and reallocates{" "}
                  <span className="text-primary">{summary.flippedCount}</span>.
                </>
              )}
            </p>
          </div>

          {/* Publishing as */}
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-label-caps text-primary">PUBLISHING AS</label>
            <div className="relative">
              <select
                className="w-full appearance-none technical-border bg-surface p-3 font-data-mono text-data-mono text-primary rounded-none outline-none focus:bg-primary focus:text-on-primary transition-none cursor-pointer"
                value={who}
                onChange={(e) => setWho(e.target.value)}
              >
                {APPROVERS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-primary">
                arrow_drop_down
              </span>
            </div>
          </div>

          {/* Why */}
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-label-caps text-primary">
              WHY (REQUIRED — NO SILENT DIAL CHANGES)
            </label>
            <textarea
              className="w-full technical-border bg-surface p-3 font-data-mono text-data-mono text-primary rounded-none outline-none focus:bg-surface-bright transition-none resize-none"
              rows={3}
              placeholder="e.g. Q3 board mandate: weight Direct Customer Revenue heavier to fund the growth gap."
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>

          {/* Approvals — 2-of-4 */}
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-label-caps text-primary">
              APPROVAL — {APPROVAL_THRESHOLD} OF 4 REQUIRED (UI-STUBBED IN V1)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {APPROVERS.map((a) => {
                const on = approvals.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`technical-border p-3 font-data-mono text-data-mono text-left flex items-center gap-2 transition-none ${
                      on
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface text-on-surface-variant hover:bg-surface-bright"
                    }`}
                    onClick={() => toggleApproval(a.id)}
                    aria-pressed={on}
                  >
                    <span className={`material-symbols-outlined shrink-0`} style={{ fontSize: "16px" }}>
                      {on ? "check_box" : "check_box_outline_blank"}
                    </span>
                    <span className="truncate">{a.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="font-data-mono text-on-surface-variant" style={{ fontSize: "10px" }}>
              {approvals.length}/{APPROVAL_THRESHOLD} APPROVALS ·{" "}
              {approvals.length >= APPROVAL_THRESHOLD ? "THRESHOLD MET" : "THRESHOLD NOT MET"}
            </div>
          </div>

          {err && (
            <div className="technical-border bg-surface-bright p-3" style={{ borderWidth: "2px" }}>
              <div className="font-label-caps text-label-caps text-error mb-1">REFUSED</div>
              <div className="font-data-mono text-data-mono text-primary">{err}</div>
            </div>
          )}

          <div className="flex justify-end items-center gap-3 pt-1">
            <button
              type="button"
              className="font-label-caps text-label-caps text-primary technical-border px-4 py-3 hover:bg-surface-variant disabled:opacity-40 transition-none"
              onClick={onCancel}
              disabled={publishing}
            >
              CANCEL
            </button>
            <button
              type="button"
              className="font-label-caps text-label-caps technical-border px-4 py-3 bg-secondary-container text-on-secondary-container hover:bg-primary hover:text-on-primary disabled:opacity-40 disabled:hover:bg-secondary-container disabled:hover:text-on-secondary-container transition-none"
              onClick={onPublish}
              disabled={!canPublish}
            >
              {publishing ? "DEPLOYING…" : `DEPLOY ${nextVersion}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublishedBanner({ data }) {
  return (
    <div className="technical-border bg-secondary-container p-margin flex justify-between items-start flex-wrap gap-4" style={{ borderWidth: "2px" }}>
      <div>
        <div className="font-label-caps text-label-caps text-on-secondary-container flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            verified
          </span>
          DEPLOYED · METHODOLOGY {data.version}
        </div>
        <p className="font-data-mono text-data-mono text-on-secondary-container m-0 mt-2 leading-relaxed">
          On the chain. {data.summary?.movedCount ?? 0} rank
          {data.summary?.movedCount === 1 ? "" : "s"} moved, {data.summary?.flippedCount ?? 0} reallocated.
          Chain verify: <strong>{data.verify?.ok ? "OK" : "BROKEN"}</strong> ({data.chainCount} events).{" "}
          <a className="underline" href="/audit">
            View it on the audit log.
          </a>
        </p>
      </div>
      <div className="flex flex-col gap-1 text-right">
        <span className="font-label-caps text-label-caps text-on-secondary-container">METHODOLOGY RECEIPT</span>
        <span className="font-data-mono text-data-mono text-on-secondary-container">
          {(data.receipt || "").slice(0, 16)}
        </span>
      </div>
    </div>
  );
}

function SbStat({ n, label, green = false }) {
  return (
    <div className="p-gutter">
      <div
        className={`font-headline-md text-headline-md tabular-nums ${green ? "text-secondary" : "text-primary"}`}
      >
        {n}
      </div>
      <div className="font-label-caps text-label-caps text-on-surface-variant mt-1">{label}</div>
    </div>
  );
}
