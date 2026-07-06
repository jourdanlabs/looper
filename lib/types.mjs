// LOOPER — shared shapes, enums, helpers.
//
// The merged Initiative model (the Appendix A rubric × the prioritization
// engine). Everything the scoring + governance + output layers agree on lives
// here, in the open, as data — not buried in a model's opinion. Same inputs,
// same score, every time. That is what makes it auditable.
//
// This module is pure data + tiny pure helpers. No node:crypto, no I/O — safe
// to import from anywhere (engine, app, tests).

// ─────────────────────────────────────────────────────────────────────────────
// Value types (§4 / §5). These are the 5 strategic levers the Dial Board tunes.
// Each carries a default weight in lib/dials.mjs; the *keys* are canonical here.
// ─────────────────────────────────────────────────────────────────────────────
export const VALUE_TYPES = Object.freeze({
  REVENUE: "Direct Customer Revenue",
  SERVICE: "Direct Customer Service",
  ENABLER: "Internal Enabler",
  RISK: "Risk-Compliance",
  OPTIONALITY: "Strategic-Optionality",
});

/** Ordered list of the value-type labels (stable order = stable dial order). */
export const VALUE_TYPE_LIST = Object.freeze([
  VALUE_TYPES.REVENUE,
  VALUE_TYPES.SERVICE,
  VALUE_TYPES.ENABLER,
  VALUE_TYPES.RISK,
  VALUE_TYPES.OPTIONALITY,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Tiers (§2.5). Six-tier lifecycle. Order matters: index 0 is the top tier.
// mandate=Yes auto-pins to TIERS[0] (NOW). Tier boundaries are score+capacity
// driven; within-tier order is informational.
// ─────────────────────────────────────────────────────────────────────────────
export const TIERS = Object.freeze({
  NOW: "Now",
  NEXT: "Next",
  LATER: "Later",
  WATCHLIST: "Watchlist",
  COLD: "Cold",
  ARCHIVED: "Archived",
});

/** Ordered, top-to-bottom. TIER_LIST[0] === "Now" is the top/pinned tier. */
export const TIER_LIST = Object.freeze([
  TIERS.NOW,
  TIERS.NEXT,
  TIERS.LATER,
  TIERS.WATCHLIST,
  TIERS.COLD,
  TIERS.ARCHIVED,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Confidence levels (§4). Each of deliveryConfidence × valueConfidence ∈ this.
// Confidence = deliveryConfidence × valueConfidence.
// ─────────────────────────────────────────────────────────────────────────────
export const CONFIDENCE = Object.freeze({ LOW: 0.5, MEDIUM: 0.8, HIGH: 1.0 });
export const CONFIDENCE_LEVELS = Object.freeze([0.5, 0.8, 1.0]);

// ─────────────────────────────────────────────────────────────────────────────
// Talent profile (§4.2 anti-gaming). Modifies Confidence (a scarcer profile is
// less certain to land) and surfaces as a CAPACITY concern — it never inflates
// priority. Multipliers applied to Confidence in lib/score.mjs.
// ─────────────────────────────────────────────────────────────────────────────
export const TALENT_PROFILE = Object.freeze({
  ANY: "Any",
  SPECIALIST: "Specialist",
  STAFF_PLUS: "Staff+",
});
export const TALENT_PROFILE_LIST = Object.freeze([
  TALENT_PROFILE.ANY,
  TALENT_PROFILE.SPECIALIST,
  TALENT_PROFILE.STAFF_PLUS,
]);

/** Confidence multiplier per talent profile. Scarcer talent → lower certainty. */
export const TALENT_CONFIDENCE_FACTOR = Object.freeze({
  [TALENT_PROFILE.ANY]: 1.0,
  [TALENT_PROFILE.SPECIALIST]: 0.9,
  [TALENT_PROFILE.STAFF_PLUS]: 0.8,
});

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle state (§5). Draft→Submitted is gated by evidence (lib/rubric.mjs).
// ─────────────────────────────────────────────────────────────────────────────
export const STATES = Object.freeze({
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ACTIVE: "Active",
  WATCHLIST: "Watchlist",
  COLD: "Cold",
  ARCHIVED: "Archived",
  REJECTED: "Rejected",
});
export const STATE_LIST = Object.freeze([
  STATES.DRAFT,
  STATES.SUBMITTED,
  STATES.ACTIVE,
  STATES.WATCHLIST,
  STATES.COLD,
  STATES.ARCHIVED,
  STATES.REJECTED,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Budget cycle position (§4). Surfaced as context, NOT scored.
// ─────────────────────────────────────────────────────────────────────────────
export const BUDGET_CYCLE = Object.freeze({
  PRE_LOCK: "Pre-cycle",
  POST_LOCK: "Post-cycle",
  CROSSES_LOCK: "Crosses-cycle",
});
export const BUDGET_CYCLE_LIST = Object.freeze([
  BUDGET_CYCLE.PRE_LOCK,
  BUDGET_CYCLE.POST_LOCK,
  BUDGET_CYCLE.CROSSES_LOCK,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Business-impact channels — the /board filter axis (Partner/Consumer/
// Platform). Optional on an Initiative; used only for filtering the readout.
// ─────────────────────────────────────────────────────────────────────────────
export const BUSINESS_IMPACT = Object.freeze({
  PARTNER: "Partner",
  CONSUMER: "Consumer",
  PLATFORM: "Platform",
});
export const BUSINESS_IMPACT_LIST = Object.freeze([
  BUSINESS_IMPACT.PARTNER,
  BUSINESS_IMPACT.CONSUMER,
  BUSINESS_IMPACT.PLATFORM,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Funding outcome after capacity allocation.
// ─────────────────────────────────────────────────────────────────────────────
export const FUNDING = Object.freeze({
  FUNDED: "FUNDED",
  BENCHED: "BENCHED",
  HELD_DUPLICATE: "HELD_DUPLICATE",
});

/** Dedup verdicts — the "are we building a third calculator?" gate. */
export const DEDUP = Object.freeze({ UNIQUE: "UNIQUE", DUPLICATE: "DUPLICATE" });

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio taxonomy — Planning Group is the spine dimension across modules.
// Draft labels until the committee supplies the canonical list.
// ─────────────────────────────────────────────────────────────────────────────
export const LEVELS = Object.freeze({
  INITIATIVE: "Initiative",
  EPIC: "Epic",
  USER_STORY: "UserStory",
});
export const LEVEL_LIST = Object.freeze([
  LEVELS.INITIATIVE,
  LEVELS.EPIC,
  LEVELS.USER_STORY,
]);

export const PLANNING_GROUPS = Object.freeze({
  PAYMENTS: "Payments",
  GROWTH: "Growth",
  CORE_PLATFORM: "Core Platform",
  DEVELOPER_PLATFORM: "Developer Platform",
  TRUST_SAFETY: "Trust & Safety",
});
export const PLANNING_GROUP_LIST = Object.freeze([
  PLANNING_GROUPS.PAYMENTS,
  PLANNING_GROUPS.GROWTH,
  PLANNING_GROUPS.CORE_PLATFORM,
  PLANNING_GROUPS.DEVELOPER_PLATFORM,
  PLANNING_GROUPS.TRUST_SAFETY,
]);

export const TEAMS = Object.freeze({
  PAYMENTS_ENG: "Payments Engineering",
  CONSUMER_PRODUCT: "Consumer Product",
  CORE_PLATFORM: "Core Platform",
  DATA_ANALYTICS: "Data & Analytics",
  TRUST_SAFETY_ENG: "Trust & Safety Engineering",
});
export const TEAM_LIST = Object.freeze([
  TEAMS.PAYMENTS_ENG,
  TEAMS.CONSUMER_PRODUCT,
  TEAMS.CORE_PLATFORM,
  TEAMS.DATA_ANALYTICS,
  TEAMS.TRUST_SAFETY_ENG,
]);

export const PRODUCTS = Object.freeze({
  CHECKOUT: "Checkout",
  ACCOUNT_HUB: "Account Hub",
  PLATFORM_CORE: "Platform Core",
  MARKETPLACE: "Marketplace",
});
export const PRODUCT_LIST = Object.freeze([
  PRODUCTS.CHECKOUT,
  PRODUCTS.ACCOUNT_HUB,
  PRODUCTS.PLATFORM_CORE,
  PRODUCTS.MARKETPLACE,
]);

/** Jira project keys for the backends (stub until credentials land). */
export const JIRA_PROJECTS = Object.freeze({
  INTAKE: "INTAKE",
  GOV: "GOV",
});

// ─────────────────────────────────────────────────────────────────────────────
// Intake minimum (CADMUS discipline): the structural fields that must exist for
// an item to be a real, comparable Initiative at all. (Evidence enforcement for
// the Draft→Submitted gate is a *separate, richer* check in lib/rubric.mjs.)
// ─────────────────────────────────────────────────────────────────────────────
export const REQUIRED_FIELDS = Object.freeze([
  "id",
  "title",
  "area",
  "sponsor",
  "outcome",
  "valueType",
  "reach",
  "effortTeamWeeks",
  "deliveryConfidence",
  "valueConfidence",
]);

/**
 * The merged Initiative (Appendix A × the engine). Field-level docs.
 *
 * @typedef {Object} Reach
 * @property {number} value   customers / items / engineers affected per year
 * @property {string} unit    "customers" | "items" | "engineers" | …
 * @property {string} [source]
 *
 * @typedef {Object} Initiative
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} area               owning area / pillar
 * @property {string} sponsor
 * @property {string} outcome            short phrase — drives dedup
 * @property {string} valueType          one of VALUE_TYPES
 * @property {boolean} mandate           true → auto-pins to top tier
 * @property {string} [mandateCitation]  required when mandate=true
 * @property {string} [businessImpact]   one of BUSINESS_IMPACT (filter axis)
 * @property {Reach} reach               { value, unit, source }
 *
 * NPV inputs (all optional, default 0 — only what applies to an item is set):
 * @property {number} [revenueImpact]        3-yr gross revenue $
 * @property {number} [cogs]                 0..1 cost-of-goods fraction on revenue
 * @property {number} [costSaveAnnual]       annual recurring cost-save $
 * @property {string} [savingsEffectiveDate] ISO date the save starts (time-value)
 * @property {number} [costAvoid]            one-time avoided cost $ (counterfactual)
 * @property {number} [pAvoid]               0..1 probability the avoid materializes
 * @property {number} [riskReduction]        $ exposure removed
 * @property {number} [pRisk]                0..1 probability the risk would hit
 * @property {number} [customerImpact]       monetized CSAT/retention/NPS $ /yr
 * @property {number} [ongoingTCO]           recurring run cost $ /yr (subtracted)
 * @property {string} [budgetCyclePosition]  one of BUDGET_CYCLE (surfaced, not scored)
 *
 * RICE / confidence inputs:
 * @property {number} deliveryConfidence  ∈ {0.5,0.8,1.0}
 * @property {number} valueConfidence     ∈ {0.5,0.8,1.0}
 * @property {number} effortTeamWeeks     team-weeks vs the standard team
 * @property {string} [talentProfile]     one of TALENT_PROFILE
 * @property {string[]} [dependsOn]       other initiative ids
 * @property {Object<string,string>} [evidence]  { field: source } per Appendix A
 * @property {string} [state]             one of STATES (default Draft)
 *
 * Portfolio taxonomy (Planning Group spine):
 * @property {string} [planningGroup]      one of PLANNING_GROUP_LIST
 * @property {string} [team]              one of TEAM_LIST
 * @property {string} [product]           one of PRODUCT_LIST
 * @property {string} [level]             Initiative | Epic | UserStory (default Initiative)
 * @property {string} [parentId]          parent item id in the hierarchy
 */

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — relied on by dedup + score normalization.
// ─────────────────────────────────────────────────────────────────────────────

/** Lowercase, strip punctuation, collapse whitespace. */
export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token set of words longer than 2 chars (used by dedup's Jaccard). */
export function tokenSet(s) {
  return new Set(norm(s).split(" ").filter((w) => w.length > 2));
}

/** Clamp n into [lo, hi]. */
export function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}
