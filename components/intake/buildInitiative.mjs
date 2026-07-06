// components/intake/buildInitiative.mjs — Intake route helper (pure).
//
// Maps the flat form state to the merged Initiative shape the ENGINE expects.
// This is NOT engine logic — it does no scoring, no validation, no tiering. It
// only shapes the object that lib/rubric.mjs (validate/canSubmit) and
// lib/score.mjs (scoreInitiative) consume. Numbers become numbers, the evidence
// keys land where rubric.mjs looks for them, and empty values are dropped so the
// conditional evidence rules only fire on claims the submitter actually made.
//
// Client-safe: no node:crypto, no I/O. Pure function of form state.

import { VALUE_TYPES } from "../../lib/types.mjs";

/** Parse a money/number field; "" → undefined (so a claim isn't "made"). */
function n(v) {
  if (v === "" || v === null || v === undefined) return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}

/** Trim a string field; "" → undefined. */
function s(v) {
  const t = String(v ?? "").trim();
  return t === "" ? undefined : t;
}

/**
 * Build the Initiative object from form state. Evidence sub-keys are only set
 * when the corresponding claim AND its source are present — matching the
 * conditional rules in lib/rubric.mjs so the gate reads exactly what's claimed.
 *
 * @param {object} f  flat form state (see DEFAULT_FORM below)
 * @returns {object}  Initiative (engine-shaped)
 */
export function buildInitiative(f) {
  const evidence = {};
  // Each evidence channel mirrors a rubric.mjs rule. Only attach when present.
  if (s(f.evReach)) evidence.reach = s(f.evReach);
  if (s(f.evRevenue)) evidence.revenue = s(f.evRevenue);
  if (s(f.evCostSave)) evidence.costSave = s(f.evCostSave);
  if (s(f.evCostAvoid)) evidence.costAvoid = s(f.evCostAvoid);
  if (s(f.evRiskReduction)) evidence.riskReduction = s(f.evRiskReduction);
  if (s(f.evCustomerImpact)) evidence.customerImpact = s(f.evCustomerImpact);
  if (s(f.evTco)) evidence.tco = s(f.evTco);
  if (s(f.mandateCitation)) evidence.mandate = s(f.mandateCitation);

  const reach = {
    value: n(f.reachValue) ?? 0,
    unit: s(f.reachUnit) ?? "units",
  };
  if (s(f.evReach)) reach.source = s(f.evReach);

  const it = {
    id: s(f.id) ?? "",
    title: s(f.title) ?? "",
    description: s(f.description) ?? "",
    area: s(f.area) ?? "",
    sponsor: s(f.sponsor) ?? "",
    outcome: s(f.outcome) ?? "",
    valueType: f.valueType || undefined,
    mandate: !!f.mandate,
    reach,
    effortTeamWeeks: n(f.effortTeamWeeks) ?? 0,
    deliveryConfidence: n(f.deliveryConfidence) ?? 0.8,
    valueConfidence: n(f.valueConfidence) ?? 0.8,
    talentProfile: f.talentProfile || undefined,
    businessImpact: f.businessImpact || undefined,
    budgetCyclePosition: f.budgetCyclePosition || undefined,
    evidence,
  };

  if (f.mandate && s(f.mandateCitation)) it.mandateCitation = s(f.mandateCitation);

  // NPV inputs — only set when a value is present (so claims aren't fabricated).
  const npvFields = {
    revenueImpact: n(f.revenueImpact),
    cogs: n(f.cogs),
    costSaveAnnual: n(f.costSaveAnnual),
    savingsEffectiveDate: s(f.savingsEffectiveDate),
    costAvoid: n(f.costAvoid),
    pAvoid: n(f.pAvoid),
    riskReduction: n(f.riskReduction),
    pRisk: n(f.pRisk),
    customerImpact: n(f.customerImpact),
    ongoingTCO: n(f.ongoingTCO),
  };
  for (const [k, v] of Object.entries(npvFields)) {
    if (v !== undefined) it[k] = v;
  }

  return it;
}

/** Blank form — the "napkin" starting point (refused until structured). */
export const DEFAULT_FORM = Object.freeze({
  id: "",
  title: "",
  description: "",
  area: "",
  sponsor: "",
  outcome: "",
  valueType: "",
  businessImpact: "",
  budgetCyclePosition: "",
  mandate: false,
  mandateCitation: "",
  reachValue: "",
  reachUnit: "",
  revenueImpact: "",
  cogs: "",
  costSaveAnnual: "",
  savingsEffectiveDate: "",
  costAvoid: "",
  pAvoid: "",
  riskReduction: "",
  pRisk: "",
  customerImpact: "",
  ongoingTCO: "",
  deliveryConfidence: "0.8",
  valueConfidence: "0.8",
  effortTeamWeeks: "",
  talentProfile: "Any",
  // evidence sources (each maps to a rubric.mjs rule)
  evReach: "",
  evRevenue: "",
  evCostSave: "",
  evCostAvoid: "",
  evRiskReduction: "",
  evCustomerImpact: "",
  evTco: "",
});

/**
 * A worked example that PASSES the gate (the "found-money" self-serve
 * onboarding portal, mirrors seed INIT-001). Lets the committee see the happy
 * path in one click — still synthetic, still scored by the real engine.
 */
export const DEMO_FORM = Object.freeze({
  ...DEFAULT_FORM,
  id: "INIT-NEW-01",
  title: "Self-Serve Partner Portal",
  description:
    "Net-new self-serve portal that signs up and onboards partners. High-margin revenue, small surface area — found money.",
  area: "Growth",
  sponsor: "Strategy",
  outcome: "partner marketplace portal",
  valueType: VALUE_TYPES.REVENUE,
  businessImpact: "Consumer",
  budgetCyclePosition: "Pre-cycle",
  mandate: false,
  reachValue: "18000",
  reachUnit: "partners",
  revenueImpact: "7200000",
  cogs: "0.18",
  ongoingTCO: "140000",
  deliveryConfidence: "1",
  valueConfidence: "0.8",
  effortTeamWeeks: "8",
  talentProfile: "Any",
  evReach: "Partnerships TAM model 2026-Q1",
  evRevenue: "Strategy revenue memo REV-2026-014",
  evTco: "Cloud cost quote REF-Q1-883",
});
