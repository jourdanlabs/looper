// HL Prioritization OS — BASE SCORE (business-case-independent).
//
// The launch discipline (leadership, 2026-07): a request gets ONE consistent
// prioritization score the moment it enters intake — BEFORE any business case
// exists. "The score is independent of the business case. If a business case is
// later provided, it MODIFIES the score, not the scoring framework."
//
// This module implements exactly that separation:
//
//   baseScore(answers)            → 0..100 from intake-answerable factors only.
//                                   No dollars. No NPV. Same answers → same score.
//   businessCaseModifier(base,bc) → an OPTIONAL, transparent adjustment applied
//                                   ON TOP when financials arrive. It never
//                                   changes the base framework; it scales it.
//
// Why this is the wedge vs. an LLM scorer: this is a pure function of published
// weights. Re-run it a thousand times on the same answers and you get the same
// number and the same receipt. An LLM re-scoring the same request can drift —
// which, for a leadership-visible triage that people must defend, is a fairness
// problem, not a feature. Determinism is the whole point.
//
// The RUBRIC below is the ONE thing that swaps to match "their" model: change
// the factors/weights/bands here (or pass an override) and every downstream
// consumer — triage, shadow harness, receipts — follows. Nothing else moves.

import { createHash } from "node:crypto";
import { CONFIDENCE } from "./types.mjs";

export const BASE_METHODOLOGY_VERSION = "base-v1.0";

// ─────────────────────────────────────────────────────────────────────────────
// The base rubric. Every factor is answerable at intake WITHOUT a business case.
// Each factor resolves to a 0..1 signal; the weighted sum (weights sum to 1.0)
// maps to a 0..100 base score. Deliberately NO revenue / NPV / cost figure here.
//
// `weight`  — relative importance (auto-normalized, so you can pass raw numbers).
// `resolve` — pulls a 0..1 signal from the intake answers. Missing/blank →
//             `absent` (a neutral floor), and the factor is flagged as unanswered
//             so intake can require it rather than silently guessing.
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_BASE_RUBRIC = Object.freeze({
  version: BASE_METHODOLOGY_VERSION,
  factors: Object.freeze([
    {
      key: "strategicAlignment",
      label: "Strategic alignment",
      weight: 0.22,
      // 0..3 intake answer → 0..1. How directly it advances a stated pillar goal.
      resolve: (a) => scale03(a.strategicAlignment),
    },
    {
      key: "regulatoryMandate",
      label: "Regulatory / mandate",
      weight: 0.2,
      // Hard must-do (statute/regulator/legal). Binary mandate OR a 0..3 scale.
      resolve: (a) =>
        a.mandate === true ? 1 : a.regulatoryMandate != null ? scale03(a.regulatoryMandate) : 0,
    },
    {
      key: "riskReduction",
      label: "Risk / compliance exposure reduced",
      weight: 0.15,
      // Severity of operational/security/compliance risk this removes (0..3).
      // NOTE: severity, not dollars — the dollar risk-reduction is business case.
      resolve: (a) => scale03(a.riskLevel ?? a.riskReduction03),
    },
    {
      key: "reach",
      label: "Reach / breadth of impact",
      weight: 0.13,
      // How many are affected (count, not $). Banded so 5M doesn't bury 50k.
      resolve: (a) => reachBand(a.reach?.value ?? a.reachCount ?? a.reach),
    },
    {
      key: "timeSensitivity",
      label: "Time sensitivity / window",
      weight: 0.12,
      // Is there a real deadline/window (reg date, market window)? 0..3.
      resolve: (a) => scale03(a.timeSensitivity),
    },
    {
      key: "dependencyLeverage",
      label: "Dependency leverage (unblocks others)",
      weight: 0.08,
      // Does completing this enable/unblock other work? 0..3.
      resolve: (a) => scale03(a.dependencyLeverage),
    },
    {
      key: "confidence",
      label: "Delivery + value confidence",
      weight: 0.1,
      // deliveryConfidence × valueConfidence (each 0.5/0.8/1.0) → 0..1.
      resolve: (a) => confidenceSignal(a),
    },
  ]),
  // Effort is a COST axis, not a value factor — it dampens the score so a cheap
  // strong item outranks an equally-strong expensive one, WITHOUT touching the
  // business case. `effortDamp` maps team-weeks → a 0.6..1.0 multiplier on the
  // weighted value. (Absent effort = no dampening.)
  effortDamp: (a) => effortDampening(a.effortTeamWeeks ?? a.effort),
});

// ── the base score ───────────────────────────────────────────────────────────
/**
 * Score intake answers with NO business case. Pure + deterministic.
 * @param {object} answers  intake answers (see rubric factors)
 * @param {object} [opts]
 * @param {object} [opts.rubric]  override rubric (defaults to DEFAULT_BASE_RUBRIC)
 * @returns {{ baseScore:number, factors:object[], effortMultiplier:number,
 *            unanswered:string[], rubricVersion:string, receipt_sha256:string }}
 */
export function baseScore(answers = {}, opts = {}) {
  const rubric = opts.rubric ?? DEFAULT_BASE_RUBRIC;
  const totalWeight = rubric.factors.reduce((s, f) => s + f.weight, 0) || 1;

  const unanswered = [];
  let weighted = 0;
  const factors = rubric.factors.map((f) => {
    const raw = f.resolve(answers);
    const signal = clamp01(raw == null ? 0 : raw);
    if (raw == null || raw === undefined) unanswered.push(f.key);
    const w = f.weight / totalWeight;
    const contribution = signal * w;
    weighted += contribution;
    return {
      key: f.key,
      label: f.label,
      signal: round4(signal),
      weight: round4(w),
      contribution: round4(contribution),
      answered: raw != null,
    };
  });

  const effortMultiplier = rubric.effortDamp ? clamp(rubric.effortDamp(answers), 0.3, 1) : 1;
  const baseScore = Math.round(clamp(weighted * effortMultiplier * 100, 0, 100));

  const out = {
    rubricVersion: rubric.version,
    baseScore,
    effortMultiplier: round4(effortMultiplier),
    factors,
    unanswered,
    businessCaseApplied: false,
  };
  out.receipt_sha256 = receiptHash(out, answers, rubric);
  return out;
}

// ── the business-case MODIFIER (optional, applied on top) ────────────────────
/**
 * Adjust an existing base result with a business case. The base framework is
 * untouched — this scales the base score by a bounded, transparent multiplier
 * derived from the NPV/value magnitude. Same base + same business case → same
 * adjusted score.
 *
 * @param {object} base      a result from baseScore()
 * @param {object} bc        business case: { npv } OR { revenueImpact, costSaveAnnual }
 * @param {object} [opts]
 * @param {number} [opts.maxLift=0.4]  cap: a maximal case lifts the base by ≤40%
 * @param {number} [opts.knee=5_000_000]  $ magnitude that maps to the mid-lift
 * @returns {object} a NEW result: { ...base, businessCaseApplied:true,
 *          baseScore (unchanged), adjustedScore, businessCase:{...} }
 */
export function applyBusinessCase(base, bc = {}, opts = {}) {
  const maxLift = opts.maxLift ?? 0.4;
  const knee = opts.knee ?? 5_000_000;
  const magnitude = num(bc.npv, num(bc.revenueImpact, 0) + num(bc.costSaveAnnual, 0));

  // No positive case → no lift. A business case can only ever HELP here (the
  // absence of one already scored on merit); it never silently demotes.
  let lift = 0;
  if (magnitude > 0) {
    // log-scaled so the modifier is smooth and a mega-case can't run away:
    // magnitude==knee → half the max lift; 100×knee → ~max lift.
    const l = 0.5 + 0.25 * Math.log10(magnitude / knee);
    lift = clamp(l, 0, 1) * maxLift;
  }

  const adjustedScore = Math.round(clamp(base.baseScore * (1 + lift), 0, 100));
  const out = {
    ...base,
    businessCaseApplied: true,
    adjustedScore,
    businessCase: {
      magnitude: Math.round(magnitude),
      liftPct: round4(lift),
      maxLiftPct: maxLift,
      knee,
      note: "Business case modifies the score; the base framework is unchanged.",
    },
  };
  out.receipt_sha256 = receiptHash(out, { ...base, bc }, null);
  return out;
}

/** Convenience: score, then (optionally) apply a business case in one call. */
export function scoreRequest(answers = {}, opts = {}) {
  const base = baseScore(answers, opts);
  const bc = opts.businessCase;
  if (bc && (num(bc.npv) > 0 || num(bc.revenueImpact) > 0 || num(bc.costSaveAnnual) > 0)) {
    return applyBusinessCase(base, bc, opts);
  }
  return base;
}

// ── deterministic helpers ────────────────────────────────────────────────────
function scale03(v) {
  if (v == null || v === "") return null; // unanswered
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return clamp01(n / 3);
}
function reachBand(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return v == null ? null : 0;
  if (n >= 1_000_000) return 1;
  if (n >= 100_000) return 0.85;
  if (n >= 10_000) return 0.7;
  if (n >= 1_000) return 0.5;
  if (n >= 100) return 0.3;
  return 0.15;
}
function confidenceSignal(a) {
  const d = confLevel(a.deliveryConfidence);
  const v = confLevel(a.valueConfidence);
  if (d == null && v == null) return null;
  const dd = d ?? CONFIDENCE.MEDIUM;
  const vv = v ?? CONFIDENCE.MEDIUM;
  return clamp01(dd * vv); // 0.25 (low×low) .. 1.0 (high×high)
}
function confLevel(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0.5, Math.min(1, n));
}
function effortDampening(weeks) {
  const n = Number(weeks);
  if (!Number.isFinite(n) || n <= 0) return 1; // unknown effort → no dampening
  if (n <= 4) return 1.0;
  if (n <= 8) return 0.94;
  if (n <= 16) return 0.86;
  if (n <= 26) return 0.78;
  if (n <= 52) return 0.68;
  return 0.6;
}

// Canonical, sorted-key serialization → sha256. No clock, no request id: the
// receipt is a pure function of (answers, rubric shape, output). Reproducible.
function receiptHash(out, answers, rubric) {
  const canon = {
    rubricVersion: out.rubricVersion,
    baseScore: out.baseScore,
    adjustedScore: out.adjustedScore ?? null,
    businessCaseApplied: out.businessCaseApplied,
    factors: (out.factors || []).map((f) => [f.key, f.signal, f.weight]),
    effortMultiplier: out.effortMultiplier ?? null,
    factorKeys: rubric ? rubric.factors.map((f) => f.key) : null,
  };
  return createHash("sha256").update(stableStringify(canon)).digest("hex");
}
function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}
function num(v, dflt = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Number(v) || 0));
}
function clamp01(v) {
  return clamp(v, 0, 1);
}
function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}
