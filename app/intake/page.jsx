"use client";

// /intake — Rubric submission (the rubric, Appendix A, §5) with the evidence gate.
// Styled as the "NEW SUBMISSION // UNVERIFIED" design: bordered section panels
// with floating corner tags, brutalist underline/box inputs, and the dark
// LIVE_SCORE_PREVIEW sidebar. The ENGINE wiring is unchanged from v1.
//
// What this route proves on the surface:
//   • the full merged Initiative model as a structured form (no free-text asks);
//   • LIVE evidence enforcement — lib/rubric.mjs validate()/canSubmit() decide
//     whether a Draft can become Submitted, and the REFUSAL is shown when a
//     claim is made without its source (CADMUS discipline, the napkin is killed);
//   • a deterministic SCORE PREVIEW — lib/score.mjs scoreInitiative() runs on the
//     current inputs every keystroke (same inputs → same number);
//   • on submit, the cleared item is appended to a local queue showing what
//     WOULD enter prioritization. Honest: synthetic, in-session, no persistence.
//
// All engine logic is CALLED, never re-implemented. validate, canSubmit, and
// scoreInitiative are pure + node:crypto-free, so they are safe in this
// "use client" component. The hash-chained ledger + full prioritize() pipeline
// live server-side on the Board / Audit routes.

import { useEffect, useMemo, useState } from "react";

import { validate, canSubmit } from "../../lib/rubric.mjs";
import { scoreInitiative } from "../../lib/score.mjs";
import {
  VALUE_TYPE_LIST,
  TALENT_PROFILE_LIST,
  BUSINESS_IMPACT_LIST,
  BUDGET_CYCLE_LIST,
  REQUIRED_FIELDS,
  norm,
} from "../../lib/types.mjs";
import { INITIATIVES } from "../../seed/initiatives.mjs";

import {
  TextField,
  AreaField,
  SelectField,
  NumField,
  DateField,
} from "../../components/intake/StitchFields.jsx";
import ScorePreviewStitch from "../../components/intake/ScorePreviewStitch.jsx";
import GateNoticeStitch from "../../components/intake/GateNoticeStitch.jsx";
import SubmittedQueueStitch from "../../components/intake/SubmittedQueueStitch.jsx";
import {
  buildInitiative,
  DEFAULT_FORM,
  DEMO_FORM,
} from "../../components/intake/buildInitiative.mjs";

const CONFIDENCE_OPTIONS = [
  { v: "0.5", l: "0.5 · LOW" },
  { v: "0.8", l: "0.8 · MEDIUM" },
  { v: "1", l: "1.0 · HIGH" },
];

const VALUE_TYPE_OPTIONS = [
  { v: "", l: "— SELECT —" },
  ...VALUE_TYPE_LIST.map((x) => ({ v: x, l: x })),
];
const BUSINESS_IMPACT_OPTIONS = [
  { v: "", l: "— NONE —" },
  ...BUSINESS_IMPACT_LIST.map((x) => ({ v: x, l: x })),
];
const BUDGET_CYCLE_OPTIONS = [
  { v: "", l: "— NONE —" },
  ...BUDGET_CYCLE_LIST.map((x) => ({ v: x, l: x })),
];
const TALENT_OPTIONS = TALENT_PROFILE_LIST.map((x) => ({ v: x, l: x }));

// Existing outcomes (normalized) so the form can warn — non-blocking — that an
// outcome looks like one already in the portfolio (the dedup gate is the Board's
// job; this is just an early heads-up so submitters don't file a 4th calculator).
const EXISTING_OUTCOMES = INITIATIVES.filter((i) => i.outcome).map((i) => ({
  id: i.id,
  outcome: i.outcome,
  norm: norm(i.outcome),
}));

export default function IntakePage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [queue, setQueue] = useState([]);
  const [flash, setFlash] = useState(null);
  const [sysDate, setSysDate] = useState("————-——-——");

  // Live SYS_DATE, set client-side to avoid a hydration mismatch.
  useEffect(() => {
    setSysDate(new Date().toISOString().slice(0, 10));
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFlash(null);
  }

  // Build the engine-shaped Initiative once per render; everything reads it.
  const initiative = useMemo(() => buildInitiative(form), [form]);

  // LIVE engine verdicts — pure calls, no duplication.
  const evidence = useMemo(() => validate(initiative), [initiative]);
  const gate = useMemo(() => canSubmit(initiative), [initiative]);

  // Structural minimum (CADMUS): REQUIRED_FIELDS present + a real value type.
  const structuralMissing = useMemo(() => {
    const miss = [];
    for (const f of REQUIRED_FIELDS) {
      if (f === "reach") {
        if (!(Number(initiative.reach?.value) > 0)) miss.push("reach.value");
        continue;
      }
      const v = initiative[f];
      if (v === undefined || v === null || String(v).trim() === "") miss.push(f);
    }
    return miss;
  }, [initiative]);

  const canSubmitNow = gate.allowed && structuralMissing.length === 0;

  // Non-blocking dedup heads-up.
  const dedupHit = useMemo(() => {
    const o = norm(form.outcome);
    if (!o) return null;
    return EXISTING_OUTCOMES.find((e) => e.norm === o) || null;
  }, [form.outcome]);

  function onSubmit(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    // Re-run the gate at submit (defensive — same engine, same verdict).
    const verdict = canSubmit(initiative);
    if (!verdict.allowed || structuralMissing.length > 0) {
      setFlash({ kind: "refused", text: "Blocked at the gate — resolve the items below." });
      return;
    }
    const { score } = scoreInitiative(initiative);
    setQueue((q) => [
      {
        key: `${initiative.id || "draft"}-${Date.now()}`,
        id: initiative.id,
        title: initiative.title,
        valueType: initiative.valueType,
        score,
        state: verdict.state, // "Submitted"
      },
      ...q,
    ]);
    setFlash({
      kind: "ok",
      text: `${initiative.id || "Draft"} cleared the gate → Submitted. It would enter the prioritization queue on the Board.`,
    });
    setForm(DEFAULT_FORM);
  }

  return (
    <main className="flex-1 w-full max-w-container-max mx-auto p-gutter md:p-margin flex flex-col gap-margin">
      {/* ── page header bar ─────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end border-b border-primary pb-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-label-caps text-label-caps text-secondary uppercase">
            RUBRIC INTAKE · EVIDENCE-ENFORCED
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary uppercase m-0">
            NEW SUBMISSION // UNVERIFIED
          </h1>
        </div>
        <div className="font-data-mono text-data-mono text-on-surface-variant whitespace-nowrap">
          SYS_DATE: {sysDate}
        </div>
      </div>

      {/* lede + worked-example / reset controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="font-body-md text-body-md text-on-surface-variant max-w-[70ch] m-0">
          Structured submission for the full Initiative model. Evidence is enforced{" "}
          <em>at submission, not at review</em> — a claim without a source cannot
          become{" "}
          <span className="font-data-mono text-data-mono text-primary">SUBMITTED</span>.
          The score preview is the real engine running on your inputs,
          deterministically, every keystroke.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setForm(DEMO_FORM);
              setFlash(null);
            }}
            className="font-label-caps text-label-caps text-primary uppercase technical-border px-3 py-2 bg-surface hover:bg-primary hover:text-on-primary transition-colors duration-100 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">science</span>
            LOAD WORKED EXAMPLE
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(DEFAULT_FORM);
              setFlash(null);
            }}
            className="font-label-caps text-label-caps text-primary uppercase technical-border px-3 py-2 bg-surface hover:bg-primary hover:text-on-primary transition-colors duration-100 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            RESET (NAPKIN)
          </button>
        </div>
      </div>

      {/* ── 12-col split: form (8) / live preview (4) ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-margin items-start">
        {/* FORM COLUMN */}
        <form
          id="intake-form"
          onSubmit={onSubmit}
          className="xl:col-span-8 flex flex-col gap-6"
        >
          {/* 01 — CORE DATA */}
          <Section tag="01_CORE_DATA">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <TextField
                label="ID"
                req
                value={form.id}
                onChange={(v) => set("id", v)}
                placeholder="NEW-01"
              />
              <TextField
                label="Sponsor"
                req
                value={form.sponsor}
                onChange={(v) => set("sponsor", v)}
                placeholder="Strategy"
              />
              <TextField
                label="Initiative Title"
                req
                span2
                value={form.title}
                onChange={(v) => set("title", v)}
                placeholder="Enter descriptive title"
              />
              <AreaField
                label="Description"
                value={form.description}
                onChange={(v) => set("description", v)}
                placeholder="What is it, and why now?"
              />
              <TextField
                label="Area / Pillar"
                req
                value={form.area}
                onChange={(v) => set("area", v)}
                placeholder="Growth"
              />
              <TextField
                label="Outcome (drives dedup)"
                req
                value={form.outcome}
                onChange={(v) => set("outcome", v)}
                placeholder="short outcome phrase"
              />
            </div>

            {dedupHit && (
              <div className="technical-border border-primary bg-surface-container mt-4 p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">
                  content_copy
                </span>
                <div className="font-body-md text-body-md text-on-surface-variant">
                  <span className="font-label-caps text-label-caps text-primary uppercase">
                    POSSIBLE DUPLICATE
                  </span>{" "}
                  — this outcome matches{" "}
                  <span className="font-data-mono text-data-mono text-primary">
                    {dedupHit.id}
                  </span>{" "}
                  (<em>{dedupHit.outcome}</em>) already in the portfolio. Not a
                  block — the dedup gate runs on the Board and would{" "}
                  <strong>hold</strong> the weaker of the cluster. Worth a look
                  before you build a duplicate.
                </div>
              </div>
            )}
          </Section>

          {/* 02 — CLASSIFICATION */}
          <Section tag="02_CLASSIFICATION">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <SelectField
                label="Value Type"
                req
                value={form.valueType}
                onChange={(v) => set("valueType", v)}
                options={VALUE_TYPE_OPTIONS}
              />
              <SelectField
                label="Business Impact"
                value={form.businessImpact}
                onChange={(v) => set("businessImpact", v)}
                options={BUSINESS_IMPACT_OPTIONS}
              />
              <SelectField
                label="Budget Cycle (surfaced, not scored)"
                value={form.budgetCyclePosition}
                onChange={(v) => set("budgetCyclePosition", v)}
                options={BUDGET_CYCLE_OPTIONS}
              />
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-label-caps text-primary uppercase">
                  MANDATE
                </span>
                <label className="flex items-center gap-2 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.mandate}
                    onChange={(e) => set("mandate", e.target.checked)}
                    className="w-4 h-4 accent-secondary"
                  />
                  <span className="font-body-md text-body-md text-on-surface-variant">
                    Regulatory / must-do (auto-pins to Now)
                  </span>
                </label>
              </div>
            </div>

            {form.mandate && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <TextField
                  label="Mandate Citation (required when mandate)"
                  span2
                  value={form.mandateCitation}
                  onChange={(v) => set("mandateCitation", v)}
                  placeholder="Security Policy SEC-4.2"
                />
              </div>
            )}
          </Section>

          {/* 03 — REACH & EFFORT (RICE metrics) */}
          <Section tag="03_REACH_EFFORT">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">
              <NumField
                label="Reach Value /yr"
                req
                value={form.reachValue}
                onChange={(v) => set("reachValue", v)}
                placeholder="18000"
              />
              <TextField
                label="Reach Unit"
                value={form.reachUnit}
                onChange={(v) => set("reachUnit", v)}
                placeholder="customers / items"
              />
              <NumField
                label="Effort (team-weeks)"
                req
                value={form.effortTeamWeeks}
                onChange={(v) => set("effortTeamWeeks", v)}
                placeholder="8"
              />
              <SelectField
                label="Talent Profile"
                value={form.talentProfile}
                onChange={(v) => set("talentProfile", v)}
                options={TALENT_OPTIONS}
              />
              <SelectField
                label="Delivery Confidence"
                req
                value={form.deliveryConfidence}
                onChange={(v) => set("deliveryConfidence", v)}
                options={CONFIDENCE_OPTIONS}
              />
              <SelectField
                label="Value Confidence"
                req
                value={form.valueConfidence}
                onChange={(v) => set("valueConfidence", v)}
                options={CONFIDENCE_OPTIONS}
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Reach Source (required when reach > 0)"
                  value={form.evReach}
                  onChange={(v) => set("evReach", v)}
                  placeholder="Partnerships TAM model 2026-Q1"
                />
              </div>
            </div>
          </Section>

          {/* 04 — NPV INPUTS (each line is a claim → owes a source) */}
          <Section tag="04_NPV_INPUTS">
            <p className="font-body-md text-body-md text-on-surface-variant mt-2 m-0">
              Each line is a{" "}
              <span className="font-data-mono text-data-mono text-primary">CLAIM</span>.
              Make one, owe its source — the gate fires only on what you assert.
              All optional; what you skip simply scores $0.
            </p>

            <div className="flex flex-col gap-4 mt-4">
              <ClaimBlock label="REVENUE (3-YR GROSS $)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NumField
                    label="revenueImpact"
                    money
                    value={form.revenueImpact}
                    onChange={(v) => set("revenueImpact", v)}
                    placeholder="7200000"
                  />
                  <NumField
                    label="COGS (0–1)"
                    value={form.cogs}
                    onChange={(v) => set("cogs", v)}
                    placeholder="0.18"
                  />
                  <TextField
                    label="Revenue Source"
                    span2
                    value={form.evRevenue}
                    onChange={(v) => set("evRevenue", v)}
                    placeholder="Strategy revenue memo INS-2026-014"
                  />
                </div>
              </ClaimBlock>

              <ClaimBlock label="COST-SAVE (RECURRING $/YR)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NumField
                    label="costSaveAnnual"
                    money
                    value={form.costSaveAnnual}
                    onChange={(v) => set("costSaveAnnual", v)}
                    placeholder="480000"
                  />
                  <DateField
                    label="Effective Date (time-value)"
                    value={form.savingsEffectiveDate}
                    onChange={(v) => set("savingsEffectiveDate", v)}
                  />
                  <TextField
                    label="Cost-Save Source"
                    span2
                    value={form.evCostSave}
                    onChange={(v) => set("evCostSave", v)}
                    placeholder="Call-deflection model SVC-2026-04"
                  />
                </div>
              </ClaimBlock>

              <ClaimBlock label="COST-AVOID (ONE-TIME $)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NumField
                    label="costAvoid"
                    money
                    value={form.costAvoid}
                    onChange={(v) => set("costAvoid", v)}
                    placeholder="1500000"
                  />
                  <NumField
                    label="pAvoid (0–1)"
                    value={form.pAvoid}
                    onChange={(v) => set("pAvoid", v)}
                    placeholder="0.5"
                  />
                  <TextField
                    label="Counterfactual Source"
                    span2
                    value={form.evCostAvoid}
                    onChange={(v) => set("evCostAvoid", v)}
                    placeholder="legacy EOL support quote REF-2026-12"
                  />
                </div>
              </ClaimBlock>

              <ClaimBlock label="RISK-REDUCTION ($ EXPOSURE)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NumField
                    label="riskReduction"
                    money
                    value={form.riskReduction}
                    onChange={(v) => set("riskReduction", v)}
                    placeholder="4000000"
                  />
                  <NumField
                    label="pRisk (0–1)"
                    value={form.pRisk}
                    onChange={(v) => set("pRisk", v)}
                    placeholder="0.6"
                  />
                  <TextField
                    label="Risk-Register Ref"
                    span2
                    value={form.evRiskReduction}
                    onChange={(v) => set("evRiskReduction", v)}
                    placeholder="Risk register R-2026-1180"
                  />
                </div>
              </ClaimBlock>

              <ClaimBlock label="CUSTOMER-IMPACT (MONETIZED $/YR)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NumField
                    label="customerImpact"
                    money
                    value={form.customerImpact}
                    onChange={(v) => set("customerImpact", v)}
                    placeholder="900000"
                  />
                  <TextField
                    label="Monetization Source"
                    value={form.evCustomerImpact}
                    onChange={(v) => set("evCustomerImpact", v)}
                    placeholder="CSAT-to-retention model SVC-2026-03"
                  />
                </div>
              </ClaimBlock>

              <ClaimBlock label="ONGOING TCO (RECURRING $/YR, SUBTRACTED)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NumField
                    label="ongoingTCO"
                    money
                    value={form.ongoingTCO}
                    onChange={(v) => set("ongoingTCO", v)}
                    placeholder="140000"
                  />
                  <TextField
                    label="TCO Quote"
                    value={form.evTco}
                    onChange={(v) => set("evTco", v)}
                    placeholder="Cloud cost quote REF-Q1-883"
                  />
                </div>
              </ClaimBlock>
            </div>
          </Section>

          {/* gate verdict + flash (the refusal lives here) */}
          <GateNoticeStitch
            gate={gate}
            structuralMissing={structuralMissing}
            flash={flash}
          />

          {/* submitted queue (in-session) */}
          <SubmittedQueueStitch items={queue} onClear={() => setQueue([])} />
        </form>

        {/* LIVE PREVIEW COLUMN */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <ScorePreviewStitch
            initiative={initiative}
            gate={gate}
            canSubmitNow={canSubmitNow}
          />

          <div className="technical-border bg-surface p-4 font-data-mono text-data-mono text-on-surface-variant leading-relaxed">
            <span className="text-primary">lib/rubric.mjs</span> gates the
            submission · <span className="text-primary">lib/score.mjs</span> scores
            it · the hash-chained ledger and the full{" "}
            <span className="text-primary">prioritize()</span> pipeline run
            server-side on the Board &amp; Audit routes. This page is synthetic and
            in-session — no backend persistence in v1.{" "}
            {evidence.ok ? "EVIDENCE OK." : `${evidence.missing.length} EVIDENCE GAP(S).`}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── Stitch section panel: bordered card with the floating corner tag ──────── */
function Section({ tag, children }) {
  return (
    <section className="border border-primary bg-surface p-6 relative">
      <div className="absolute -top-3 left-4 bg-background px-2 font-label-caps text-label-caps text-primary uppercase border border-primary">
        {tag}
      </div>
      {children}
    </section>
  );
}

/* A claim group inside §04 — left ink rule + caps label, then its fields. */
function ClaimBlock({ label, children }) {
  return (
    <div className="border-l-2 border-primary pl-4 py-1">
      <div className="font-label-caps text-label-caps text-primary uppercase mb-3">
        {label}
      </div>
      {children}
    </div>
  );
}
