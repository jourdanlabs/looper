// Documentation — operating + governance processes bound to system state.

import { INITIAL_VERSION } from "../methodology.mjs";

export const DOC_KINDS = Object.freeze({
  OPERATING: "operating",
  GOVERNANCE: "governance",
});

const DOCS = [
  {
    id: "ops.intake",
    kind: DOC_KINDS.OPERATING,
    title: "Intake Operating Process",
    version: INITIAL_VERSION,
    boundTo: "CADMUS intake gate + Appendix A evidence",
    sections: [
      "Submit via /intake rubric form — unstructured asks refused at submit, not review.",
      "Required evidence fields block Draft→Submitted per Appendix A.",
      "Accepted items enter the open backlog with INITIATIVE_INTAKEN receipt.",
      "Duplicate outcomes cluster at dedup gate before capacity is spent.",
    ],
  },
  {
    id: "ops.prioritize",
    kind: DOC_KINDS.OPERATING,
    title: "Prioritization Operating Process",
    version: INITIAL_VERSION,
    boundTo: "COSMIC scorer + capacity allocator",
    sections: [
      "Initial score at Initiative, Epic, and User Story levels — same RICE+NPV function.",
      "Rescore All recomputes the open backlog into one stack-ranked list.",
      "Mandate items carve out capacity first; held duplicates never consume slots.",
      "Publish writes RANKING_PUBLISHED with who/when/why on the chain.",
    ],
  },
  {
    id: "ops.capacity",
    kind: DOC_KINDS.OPERATING,
    title: "Capacity Operating Process",
    version: INITIAL_VERSION,
    boundTo: "capacityView by Planning Group",
    sections: [
      "Capacity line is set by committee (default 12 team-slots).",
      "Allocation is top-down by score; benched items carry capacity_at_decision.",
      "Utilization views keyed on Planning Group — every figure from engine receipts.",
    ],
  },
  {
    id: "gov.dials",
    kind: DOC_KINDS.GOVERNANCE,
    title: "Dial Board Governance",
    version: INITIAL_VERSION,
    boundTo: "METHODOLOGY_PUBLISHED ledger event",
    sections: [
      "Sandbox: preview rank under proposed dials — no ledger write.",
      "Publish: requires a why; bumps methodology version; records before/after delta.",
      "Every score carries the methodology version stamp in force at compute time.",
      "v1: single-actor publish. V1.5: 2-of-4 committee approval.",
    ],
  },
  {
    id: "gov.metrics",
    kind: DOC_KINDS.GOVERNANCE,
    title: "Metrics & Reporting Governance",
    version: INITIAL_VERSION,
    boundTo: "STRATA reconcile-or-refuse + METRIC_PUBLISHED",
    sections: [
      "Metric definitions are versioned and SHA-fingerprinted.",
      "Portfolio extract numbers reconcile across JIRA/Align/Finance or refuse.",
      "Published reports and metrics are chained — tamper-evident.",
      "Assistant answers cite governed sources or refuse.",
    ],
  },
  {
    id: "gov.ppo",
    kind: DOC_KINDS.GOVERNANCE,
    title: "Governance Request Process",
    version: INITIAL_VERSION,
    boundTo: "PPO_REQUESTED / PPO_APPROVED chain events",
    sections: [
      "Team, access, Product Context, and automation changes go through Governance.",
      "Request types are registry-based — new types drop in without engine changes.",
      "Approval is human-gated; execution seals PPO_APPROVED on the chain.",
      "Access elevation requests carry permanent audit trail (who/when/what).",
    ],
  },
];

export function listDocs({ kind } = {}) {
  if (kind) return DOCS.filter((d) => d.kind === kind);
  return DOCS;
}

export function getDoc(id) {
  return DOCS.find((d) => d.id === id) ?? null;
}

export function docsManifest() {
  return {
    version: INITIAL_VERSION,
    count: DOCS.length,
    operating: DOCS.filter((d) => d.kind === DOC_KINDS.OPERATING).length,
    governance: DOCS.filter((d) => d.kind === DOC_KINDS.GOVERNANCE).length,
  };
}