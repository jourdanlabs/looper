"use client";

// DialBoard — the interactive Dial Board (§6). Client-only: it owns the slider
// state and the publish flow, and it NEVER imports the engine (node:crypto is
// server-only). All scoring happens server-side:
//
//   • every dial move  → POST /dials/preview  → preview() (SANDBOX, no chain)
//   • Publish (gated)  → POST /dials/publish  → publish() (chain + version bump)
//
// The board renders the live BEFORE/AFTER rank delta so the committee can see
// exactly what re-ranks under proposed dials before anything is committed. This
// is the Strategic-Lever Deficit fix made tactile.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./dials.css";
import { Card, Label, Mono, StatDot, ScoreMeter, FundingBadge } from "../index.js";
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

// Build the editable dial state shape from the server-resolved defaults.
function dialsFromDefaults(defaults, valueTypeList) {
  const weights = {};
  for (const vt of valueTypeList) {
    weights[vt] = defaults.valueTypeWeights[vt];
  }
  return {
    valueTypeWeights: weights,
    r: defaults.r,
    horizon: defaults.horizon,
    confidenceSensitivity: defaults.confidenceSensitivity,
  };
}

// Stable round so the "modified?" check doesn't flap on float noise.
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;
function dialsEqual(a, b, valueTypeList) {
  if (r3(a.r) !== r3(b.r)) return false;
  if (Math.round(a.horizon) !== Math.round(b.horizon)) return false;
  if (r3(a.confidenceSensitivity) !== r3(b.confidenceSensitivity)) return false;
  for (const vt of valueTypeList) {
    if (r3(a.valueTypeWeights[vt]) !== r3(b.valueTypeWeights[vt])) return false;
  }
  return true;
}

export default function DialBoard({
  valueTypeList,
  defaultDials, // engine-resolved DEFAULT_DIALS (the published baseline)
  baseline, // [{ id, rank, score, funding, dedup }] under published dials
  titles, // { [id]: { title, valueType, area } }
  initialVersion, // "v1.0"
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
  const [approvals, setApprovals] = useState([]); // approver ids
  const [publishing, setPublishing] = useState(false);
  const [publishErr, setPublishErr] = useState(null);
  const [published_, setPublished] = useState(null); // last publish receipt
  const [ledgerLocked, setLedgerLocked] = useState(false); // freeze after publish

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
          body: JSON.stringify({
            currentDials: published,
            proposedDials: proposed,
            capacity: 12,
          }),
        });
        if (!res.ok) throw new Error(`preview ${res.status}`);
        const data = await res.json();
        if (id === reqId.current) setPreview(data); // ignore stale responses
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
      // v1 is a single in-memory chain per request; once published we lock the
      // board and tell the operator the change is on the chain (audit route).
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

  const movers = useMemo(() => rows.filter((r) => r.delta !== 0 && r.delta !== null), [rows]);
  const flips = useMemo(() => rows.filter((r) => r.fundingBefore !== r.fundingAfter), [rows]);
  const summary = preview?.summary;

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      {ledgerLocked && published_ && <PublishedBanner data={published_} />}

      <div className="grid-dials">
        {/* ── DIALS column ──────────────────────────────────────────────── */}
        <div className="stack" style={{ gap: "1rem" }}>
          <Card
            title="Value-type weights"
            right={
              <Label as="span">
                {modified ? <StatDot tone="open" label="proposed" /> : <StatDot tone="green" label="published" />}
              </Label>
            }
          >
            <p className="muted" style={{ marginTop: "-0.2rem" }}>
              The 5 strategic levers. Heavier weight pushes that value type up the queue. Moving any
              dial re-runs scoring in the sandbox below — nothing is published.
            </p>
            <div className="stack" style={{ gap: "0.9rem", marginTop: "0.4rem" }}>
              {valueTypeList.map((vt) => (
                <WeightDial
                  key={vt}
                  label={vt}
                  caption={VALUE_TYPE_CAPTION[vt]}
                  value={dials.valueTypeWeights[vt]}
                  baseline={published.valueTypeWeights[vt]}
                  onChange={(v) => setWeight(vt, v)}
                  disabled={ledgerLocked}
                />
              ))}
            </div>
          </Card>

          <Card title="NPV & confidence dials">
            <div className="stack" style={{ gap: "0.9rem" }}>
              <ScalarDial
                label="Discount rate r"
                hint="Firm cost of capital used to discount the 3-yr NPV."
                value={dials.r}
                baseline={published.r}
                range={R_RANGE}
                format={(v) => pct(v, 1)}
                onChange={(v) => setScalar("r", v)}
                disabled={ledgerLocked}
              />
              <ScalarDial
                label="NPV horizon H"
                hint="Years of cash flow summed into Impact."
                value={dials.horizon}
                baseline={published.horizon}
                range={HORIZON_RANGE}
                format={(v) => `${Math.round(v)} yr`}
                onChange={(v) => setScalar("horizon", v)}
                disabled={ledgerLocked}
              />
              <ScalarDial
                label="Confidence sensitivity"
                hint=">1 punishes low-confidence harder; <1 softens it."
                value={dials.confidenceSensitivity}
                baseline={published.confidenceSensitivity}
                range={CONF_RANGE}
                format={(v) => `${Number(v).toFixed(2)}×`}
                onChange={(v) => setScalar("confidenceSensitivity", v)}
                disabled={ledgerLocked}
              />
            </div>

            <div className="divider" />
            <div className="row-flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem" }}>
              <button className="btn" onClick={resetDials} disabled={!modified || ledgerLocked}>
                Reset to published
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setPublishErr(null);
                  setShowPublish(true);
                }}
                disabled={!modified || ledgerLocked}
              >
                Publish change…
              </button>
            </div>
          </Card>
        </div>

        {/* ── SANDBOX column ────────────────────────────────────────────── */}
        <div className="stack" style={{ gap: "1rem" }}>
          <Card
            title="Sandbox — live re-rank"
            right={
              <Mono receipt>
                {pending ? "computing…" : modified ? "PROPOSED" : "BASELINE"}
              </Mono>
            }
          >
            {previewErr && (
              <div className="notice refusal" style={{ marginBottom: "0.8rem" }}>
                <Label className="label">Sandbox error</Label>
                {previewErr}
              </div>
            )}

            <div className="sandbox-stats">
              <SbStat n={summary ? summary.movedCount : 0} label="ranks moved" />
              <SbStat n={summary ? summary.flippedCount : 0} label="funding flips" green={!!(summary && summary.flippedCount)} />
              <SbStat
                n={summary && summary.biggestMover ? fmtDelta(summary.biggestMover.delta) : "—"}
                label="biggest mover"
              />
              <SbStat n={modified ? "OFF-CHAIN" : "PUBLISHED"} label="state" />
            </div>

            <p className="muted" style={{ margin: "0.8rem 0 0.2rem", fontSize: "0.82rem" }}>
              {modified
                ? "Proposed dials. This re-rank is a private preview — no methodology version, no ledger entry, until you publish."
                : "Dials at the published baseline. Move a dial to preview what re-ranks."}
            </p>
          </Card>

          <Card flush title="Before → After" right={<Label>{rows.length} initiatives</Label>}>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="rank">#</th>
                    <th>Initiative</th>
                    <th>Score</th>
                    <th className="num">Was</th>
                    <th className="num">Now</th>
                    <th className="num">Δ</th>
                    <th>Funding</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const held = row.dedup === "DUPLICATE";
                    return (
                      <tr key={row.id} className={held ? "held" : undefined}>
                        <td className="rank">{row.rankAfter}</td>
                        <td>
                          <div className="row-flex" style={{ gap: "0.5rem" }}>
                            <Mono>{row.id}</Mono>
                            <span className="dial-title">{row.title || "—"}</span>
                          </div>
                          <div className="label" style={{ marginTop: "0.15rem" }}>
                            {row.valueType || ""}
                          </div>
                        </td>
                        <td>
                          <ScoreMeter score={row.scoreAfter} width={70} />
                        </td>
                        <td className="num muted">{row.rankBefore ?? "—"}</td>
                        <td className="num">{row.rankAfter}</td>
                        <td className="num">
                          <DeltaCell delta={row.delta} />
                        </td>
                        <td>
                          <FundingCell before={row.fundingBefore} after={row.fundingAfter} />
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted" style={{ padding: "1rem 0.7rem" }}>
                        Running first sandbox pass…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {movers.length > 0 && (
            <Card title="What changed" right={<Label>{movers.length} moved · {flips.length} reallocated</Label>}>
              <ul className="change-list">
                {movers.slice(0, 8).map((m) => (
                  <li key={m.id}>
                    <Mono>{m.id}</Mono> {m.title}{" "}
                    {m.delta > 0 ? (
                      <span className="up">▲ up {m.delta}</span>
                    ) : (
                      <span className="down">▼ down {Math.abs(m.delta)}</span>
                    )}
                    {m.fundingBefore !== m.fundingAfter && (
                      <span className="muted">
                        {" "}
                        · {String(m.fundingBefore).toLowerCase()} → {String(m.fundingAfter).toLowerCase()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
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
          summary={summary}
          err={publishErr}
          publishing={publishing}
          canPublish={canPublish}
          onCancel={() => setShowPublish(false)}
          onPublish={doPublish}
        />
      )}
    </div>
  );
}

// ── presentational sub-components ─────────────────────────────────────────────

function WeightDial({ label, caption, value, baseline, onChange, disabled }) {
  const changed = r3(value) !== r3(baseline);
  return (
    <div className="dial">
      <div className="spread" style={{ alignItems: "baseline" }}>
        <div>
          <Label as="span" ink>
            {label}
          </Label>
          <span className="dial-caption"> · {caption}</span>
        </div>
        <span className="dial-val">
          {Number(value).toFixed(2)}×{changed && <span className="dial-from"> from {Number(baseline).toFixed(2)}</span>}
        </span>
      </div>
      <input
        className="slider"
        type="range"
        min={WEIGHT_RANGE.min}
        max={WEIGHT_RANGE.max}
        step={WEIGHT_RANGE.step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={`${label} weight`}
      />
    </div>
  );
}

function ScalarDial({ label, hint, value, baseline, range, format, onChange, disabled }) {
  const changed = r3(value) !== r3(baseline);
  return (
    <div className="dial">
      <div className="spread" style={{ alignItems: "baseline" }}>
        <Label as="span" ink>
          {label}
        </Label>
        <span className="dial-val">
          {format(value)}
          {changed && <span className="dial-from"> from {format(baseline)}</span>}
        </span>
      </div>
      <input
        className="slider"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
      />
      <div className="dial-caption">{hint}</div>
    </div>
  );
}

function SbStat({ n, label, green = false }) {
  return (
    <div className="sb-stat">
      <div className={`n${green ? " green" : ""}`}>{n}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function DeltaCell({ delta }) {
  if (delta === null || delta === undefined) return <span className="muted">new</span>;
  if (delta === 0) return <span className="muted">—</span>;
  return delta > 0 ? <span className="up">▲ {delta}</span> : <span className="down">▼ {Math.abs(delta)}</span>;
}

function FundingCell({ before, after }) {
  if (before === after) return <FundingBadge funding={after} />;
  return (
    <span className="row-flex" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
      <FundingBadge funding={after} />
      <span className="label" style={{ whiteSpace: "nowrap" }}>
        was {String(before || "—").toLowerCase()}
      </span>
    </span>
  );
}

function fmtDelta(d) {
  if (d === null || d === undefined) return "—";
  if (d === 0) return "0";
  return d > 0 ? `▲ ${d}` : `▼ ${Math.abs(d)}`;
}

function PublishModal({
  why,
  setWhy,
  who,
  setWho,
  approvals,
  toggleApproval,
  fromVersion,
  summary,
  err,
  publishing,
  canPublish,
  onCancel,
  onPublish,
}) {
  const next = bumpLocal(fromVersion);
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-label="Publish methodology change">
      <div className="modal card">
        <div className="card-head">
          <div className="card-title">Publish methodology change</div>
          <Mono receipt>
            {fromVersion} → {next}
          </Mono>
        </div>

        <div className="well" style={{ marginBottom: "0.9rem" }}>
          <Label className="label">What this writes to the chain</Label>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem" }}>
            A <Mono>METHODOLOGY_PUBLISHED</Mono> event — who, when, before/after rank delta, and your
            required reason. The version bumps to <Mono>{next}</Mono> and every score thereafter
            carries that stamp.{" "}
            {summary && (
              <>
                This change moves <b>{summary.movedCount}</b> rank
                {summary.movedCount === 1 ? "" : "s"} and reallocates <b>{summary.flippedCount}</b>.
              </>
            )}
          </p>
        </div>

        <div className="field">
          <Label className="label">Publishing as</Label>
          <select className="select" value={who} onChange={(e) => setWho(e.target.value)}>
            {APPROVERS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <Label className="label">Why (required — no silent dial changes)</Label>
          <textarea
            className="textarea"
            rows={3}
            placeholder="e.g. Q3 board mandate: weight Direct Customer Revenue heavier to fund the growth gap."
            value={why}
            onChange={(e) => setWhy(e.target.value)}
          />
        </div>

        <div className="field">
          <Label className="label">
            Approval — {APPROVAL_THRESHOLD} of 4 required (UI-stubbed in v1)
          </Label>
          <div className="approve-grid">
            {APPROVERS.map((a) => {
              const on = approvals.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`approve${on ? " on" : ""}`}
                  onClick={() => toggleApproval(a.id)}
                  aria-pressed={on}
                >
                  <StatDot tone={on ? "green" : "open"} />
                  <span>{a.name}</span>
                </button>
              );
            })}
          </div>
          <div className="label" style={{ marginTop: "0.4rem" }}>
            {approvals.length}/{APPROVAL_THRESHOLD} approvals ·{" "}
            {approvals.length >= APPROVAL_THRESHOLD ? "threshold met" : "threshold not met"}
          </div>
        </div>

        {err && (
          <div className="notice refusal" style={{ marginBottom: "0.8rem" }}>
            <Label className="label">Refused</Label>
            {err}
          </div>
        )}

        <div className="row-flex" style={{ justifyContent: "flex-end", gap: "0.6rem" }}>
          <button className="btn" onClick={onCancel} disabled={publishing}>
            Cancel
          </button>
          <button className="btn primary" onClick={onPublish} disabled={!canPublish}>
            {publishing ? "Publishing…" : `Publish ${next}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublishedBanner({ data }) {
  return (
    <div className="notice" style={{ borderWidth: "2px" }}>
      <div className="spread" style={{ flexWrap: "wrap", gap: "0.6rem" }}>
        <div>
          <Label eyebrow>
            <StatDot tone="green" /> Published · methodology {data.version}
          </Label>
          <p style={{ margin: "0.4rem 0 0" }}>
            On the chain. {data.summary?.movedCount ?? 0} rank
            {data.summary?.movedCount === 1 ? "" : "s"} moved, {data.summary?.flippedCount ?? 0}{" "}
            reallocated. Chain verify:{" "}
            <b>{data.verify?.ok ? "OK" : "BROKEN"}</b> ({data.chainCount} events). View it on the{" "}
            <a href="/audit">audit log</a>.
          </p>
        </div>
        <div className="stack" style={{ gap: "0.3rem", textAlign: "right" }}>
          <Label className="label">methodology receipt</Label>
          <Mono receipt>{(data.receipt || "").slice(0, 16)}</Mono>
        </div>
      </div>
    </div>
  );
}

// Local mirror of methodology.bumpVersion for the modal preview only (the
// server is the source of truth — this is display).
function bumpLocal(v) {
  const m = /^v(\d+)\.(\d+)$/.exec(String(v));
  if (!m) return "v1.1";
  return `v${m[1]}.${Number(m[2]) + 1}`;
}
