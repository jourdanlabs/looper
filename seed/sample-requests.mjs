// HL Prioritization OS — SYNTHETIC sample requests for the shadow test.
//
// SYNTHETIC ONLY — illustrative intake answers, no real requests or names. Swap
// this whole file for the launch's real sample list (same shape) when it lands.
//
// Each request carries ONLY business-case-independent intake answers — the
// factors a submitter can answer at the door, before any financials:
//   strategicAlignment 0..3 · mandate bool · riskLevel 0..3 · reach count ·
//   timeSensitivity 0..3 · dependencyLeverage 0..3 ·
//   deliveryConfidence/valueConfidence 0.5/0.8/1.0 · effortTeamWeeks
// `businessCase` (optional) is the LATER modifier — kept separate on purpose.

export const SAMPLE_REQUESTS = [
  {
    id: "REQ-001", title: "RESPA disclosure timing remediation", area: "Servicing",
    answers: {
      strategicAlignment: 2, mandate: true, riskLevel: 3, reach: 240000,
      timeSensitivity: 3, dependencyLeverage: 1,
      deliveryConfidence: 1.0, valueConfidence: 1.0, effortTeamWeeks: 10,
    },
  },
  {
    id: "REQ-002", title: "Insurance agent self-serve portal", area: "Growth",
    answers: {
      strategicAlignment: 3, mandate: false, riskLevel: 0, reach: 18000,
      timeSensitivity: 2, dependencyLeverage: 2,
      deliveryConfidence: 1.0, valueConfidence: 0.8, effortTeamWeeks: 8,
    },
    businessCase: { revenueImpact: 7_200_000 }, // later modifier
  },
  {
    id: "REQ-003", title: "Rate calculator (team A rebuild)", area: "Consumer",
    answers: {
      strategicAlignment: 1, mandate: false, riskLevel: 0, reach: 5000,
      timeSensitivity: 0, dependencyLeverage: 0,
      deliveryConfidence: 0.8, valueConfidence: 0.5, effortTeamWeeks: 20,
    },
  },
  {
    id: "REQ-004", title: "Servicing transfer audit trail", area: "Servicing",
    answers: {
      strategicAlignment: 2, mandate: false, riskLevel: 2, reach: 90000,
      timeSensitivity: 1, dependencyLeverage: 2,
      deliveryConfidence: 0.8, valueConfidence: 0.8, effortTeamWeeks: 14,
    },
  },
  {
    id: "REQ-005", title: "Marketing microsite refresh", area: "Growth",
    answers: {
      strategicAlignment: 0, mandate: false, riskLevel: 0, reach: 800,
      timeSensitivity: 0, dependencyLeverage: 0,
      deliveryConfidence: 1.0, valueConfidence: 0.5, effortTeamWeeks: 6,
    },
  },
  {
    id: "REQ-006", title: "Correspondent onboarding API", area: "Correspondent",
    answers: {
      strategicAlignment: 3, mandate: false, riskLevel: 1, reach: 4200,
      timeSensitivity: 2, dependencyLeverage: 3,
      deliveryConfidence: 0.8, valueConfidence: 0.8, effortTeamWeeks: 16,
    },
    businessCase: { npv: 3_100_000 },
  },
  {
    id: "REQ-007", title: "Fraud-signal enrichment", area: "Risk",
    answers: {
      // deliberately missing strategicAlignment + timeSensitivity → Discovery
      mandate: false, riskLevel: 3, reach: 300000,
      dependencyLeverage: 1,
      deliveryConfidence: 0.5, valueConfidence: 0.8, effortTeamWeeks: 24,
    },
  },
  {
    id: "REQ-008", title: "Exec dashboard vanity metrics", area: "Growth",
    answers: {
      strategicAlignment: 1, mandate: false, riskLevel: 0, reach: 40,
      timeSensitivity: 0, dependencyLeverage: 0,
      deliveryConfidence: 1.0, valueConfidence: 0.5, effortTeamWeeks: 30,
    },
  },
];

// SYNTHETIC "live LLM" scores for the same requests — what a re-scored, business-
// case-blind LLM might return. Note the two the shadow test should catch:
//   REQ-001: LLM scored a hard REGULATORY MANDATE at 58 — a defensibility miss.
//   REQ-008: LLM inflated a vanity item to 61 — no per-factor reason it can show.
export const LLM_SCORES = {
  "REQ-001": 58,
  "REQ-002": 74,
  "REQ-003": 41,
  "REQ-004": 63,
  "REQ-005": 22,
  "REQ-006": 70,
  "REQ-007": 55,
  "REQ-008": 61,
};
