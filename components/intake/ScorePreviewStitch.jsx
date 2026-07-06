"use client";

// ScorePreviewStitch — the dark LIVE_SCORE_PREVIEW panel from the Stitch mock,
// wired to the REAL engine.
//
// It does NOT reimplement scoring. It calls lib/score.mjs scoreInitiative() on
// the current form's Initiative and paints the receipt in Stitch's chrome: the
// bg-primary box, the giant green (secondary-fixed) RICE number, the draft-hash
// line, the RICE-term + 3-yr-NPV breakdown, and the gate-aware SUBMIT button.
// Same inputs → byte-identical number, every keystroke. The number is always
// shown for transparency; whether the item can be SUBMITTED is the evidence
// gate (passed in via `canSubmit`), not the score.
//
// scoreInitiative is pure + node:crypto-free, so it is safe in this client
// component. The hash-chained ledger and full prioritize() pipeline run
// server-side on the Board / Audit routes.

import { scoreInitiative } from "../../lib/score.mjs";

const COMPONENT_LABELS = {
  revenue: "REVENUE",
  costSave: "COST-SAVE",
  costAvoid: "COST-AVOID",
  riskReduction: "RISK-REDUCTION",
  customerImpact: "CUSTOMER-IMPACT",
  ongoingTCO: "ONGOING TCO",
};

function money(v) {
  const n = Number(v) || 0;
  const neg = n < 0;
  const a = Math.abs(n);
  let out;
  if (a >= 1_000_000) out = `$${(a / 1_000_000).toFixed(2)}M`;
  else if (a >= 1_000) out = `$${Math.round(a / 1_000)}k`;
  else out = `$${Math.round(a)}`;
  return neg ? `(${out})` : out;
}

// Display-only draft hash — a short, stable fingerprint of the inputs so the
// panel reads like the Stitch "DRAFT_HASH" line. NOT a ledger sha; the real,
// hash-chained receipts are written server-side. Deterministic: same inputs →
// same hash, which is the whole point on this surface.
function draftHash(initiative) {
  const json = JSON.stringify(initiative, Object.keys(initiative).sort());
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i += 1) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function hasInputs(initiative) {
  return Boolean(
    initiative.title ||
      initiative.valueType ||
      Number(initiative.reach?.value) > 0 ||
      Number(initiative.effortTeamWeeks) > 0 ||
      Number(initiative.revenueImpact) > 0 ||
      Number(initiative.costSaveAnnual) > 0
  );
}

export default function ScorePreviewStitch({ initiative, gate, canSubmitNow }) {
  let result;
  try {
    result = scoreInitiative(initiative);
  } catch {
    result = null;
  }

  const live = hasInputs(initiative);
  const score = result?.score ?? 0;
  const bd = result?.breakdown;
  const rice = bd?.rice;
  const npv = bd?.npv;

  const allowed = !!gate?.allowed;
  const scoreLabel = live ? Number(score).toFixed(2) : "0.00";
  const hash = live ? `#${draftHash(initiative)}` : "#Awaiting_Input";

  return (
    <div className="sticky top-[64px]">
      <div className="technical-border bg-primary text-on-primary flex flex-col">
        {/* header strip */}
        <div className="p-4 border-b border-surface-dim/30 flex justify-between items-center">
          <span className="font-label-caps text-label-caps uppercase">
            LIVE_SCORE_PREVIEW
          </span>
          <span className="material-symbols-outlined text-secondary-fixed text-[20px]">
            radar
          </span>
        </div>

        {/* the giant number */}
        <div className="p-8 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
              backgroundSize: "10px 10px",
            }}
          />
          <div className="font-label-caps text-label-caps text-inverse-primary uppercase relative z-10">
            PROJECTED RICE SCORE
          </div>
          <div className="font-headline-lg text-[64px] font-black tracking-tighter text-secondary-fixed relative z-10 leading-none py-4">
            {scoreLabel}
          </div>
          <div className="font-data-mono text-data-mono text-surface-dim/70 relative z-10">
            DRAFT_HASH: <span className="text-on-primary">{hash}</span>
          </div>
        </div>

        {/* RICE + NPV receipt — the real engine breakdown, not a re-derivation */}
        <div className="border-t border-surface-dim/30 p-4 flex flex-col gap-4">
          <div>
            <div className="font-label-caps text-label-caps text-inverse-primary uppercase mb-2">
              RICE TERMS
            </div>
            <div className="grid grid-cols-2 gap-px bg-surface-dim/30 technical-border border-surface-dim/30">
              <ReceiptCell label="REACH" v={rice ? Math.round(rice.reach).toLocaleString() : "—"} />
              <ReceiptCell label="IMPACT (NPV)" v={npv ? money(npv.total) : "—"} />
              <ReceiptCell label="CONFIDENCE" v={rice ? rice.confidence.toFixed(2) : "—"} />
              <ReceiptCell label="EFFORT (TW)" v={rice ? rice.effortTeamWeeks : "—"} />
              <ReceiptCell label="VALUE-TYPE WT" v={rice ? rice.valueTypeWeight.toFixed(2) : "—"} />
              <ReceiptCell label="TALENT FACTOR" v={rice ? rice.talentFactor.toFixed(2) : "—"} />
            </div>
          </div>

          <div>
            <div className="font-label-caps text-label-caps text-inverse-primary uppercase mb-2">
              3-YR NPV COMPONENTS
            </div>
            <div className="flex flex-col">
              {npv ? (
                Object.entries(npv.components).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between items-center py-1.5 border-b border-surface-dim/20"
                  >
                    <span className="font-data-mono text-data-mono text-surface-dim/80">
                      {COMPONENT_LABELS[k] || k}
                    </span>
                    <span className="font-data-mono text-data-mono text-on-primary">
                      {money(v)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between items-center py-1.5 border-b border-surface-dim/20">
                  <span className="font-data-mono text-data-mono text-surface-dim/60">
                    NO SCOREABLE INPUTS YET
                  </span>
                  <span className="font-data-mono text-data-mono text-surface-dim/60">—</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 mt-1">
                <span className="font-label-caps text-label-caps text-on-primary uppercase">
                  NPV IMPACT
                </span>
                <span className="font-data-mono text-data-mono font-bold text-secondary-fixed">
                  {npv ? money(npv.total) : "—"}
                </span>
              </div>
            </div>
            <div className="font-data-mono text-data-mono text-surface-dim/60 mt-1">
              RAW {bd ? bd.priorityRaw.toLocaleString() : "—"} · METHODOLOGY{" "}
              {bd?.methodologyVersion ?? "v1.0"}
            </div>
          </div>
        </div>

        {/* gate-aware submit — the refusal lives here too, as the disabled state */}
        <div className="p-4 bg-inverse-surface border-t border-surface-dim/30 flex flex-col gap-2">
          <button
            type="submit"
            form="intake-form"
            disabled={!canSubmitNow}
            className={
              canSubmitNow
                ? "w-full bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant technical-border border-secondary font-label-caps text-label-caps uppercase py-4 px-6 flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer"
                : "w-full bg-transparent text-surface-dim/60 technical-border border-surface-dim/40 font-label-caps text-label-caps uppercase py-4 px-6 flex items-center justify-center gap-2 cursor-not-allowed"
            }
          >
            <span className="material-symbols-outlined text-[18px]">
              {canSubmitNow ? "upload_file" : "lock"}
            </span>
            {canSubmitNow ? "SUBMIT TO AUDIT" : "GATE CLOSED"}
          </button>
          <div className="font-data-mono text-data-mono text-surface-dim/60 text-center">
            {allowed
              ? canSubmitNow
                ? "EVIDENCE CLEAR · ENTERS QUEUE AS SUBMITTED"
                : "STRUCTURAL FIELDS INCOMPLETE"
              : "EVIDENCE GATE OPEN · RESOLVE REFUSAL"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptCell({ label, v }) {
  return (
    <div className="bg-primary p-2 flex flex-col gap-0.5">
      <div className="font-label-caps text-[10px] tracking-[0.1em] text-surface-dim/70 uppercase">
        {label}
      </div>
      <div className="font-data-mono text-data-mono text-on-primary font-semibold">{v}</div>
    </div>
  );
}
