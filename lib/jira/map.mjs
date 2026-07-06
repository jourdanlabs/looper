// Map Jira issues ↔ LOOPER Initiative rubric.
//
// Native Jira fields carry title/description/area; the full rubric (Appendix A)
// lives in issue property `looper.v1` (or is merged on push). Issues without
// complete rubric data enter as Draft and are refused at intake until enriched.

import { VALUE_TYPES, STATES, CONFIDENCE } from "../types.mjs";
import { validate } from "../rubric.mjs";

const PROPERTY_VERSION = 1;

/** Extract plain text from Atlassian Document Format. */
export function adfToText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(adfToText).join("");
  if (node.type === "text") return node.text || "";
  if (node.content) return node.content.map(adfToText).join(node.type === "paragraph" ? "\n" : "");
  return "";
}

/** Parse looper:* labels → partial rubric hints. */
function labelsToHints(labels = []) {
  const hints = {};
  for (const label of labels) {
    if (!label.startsWith("looper:")) continue;
    const [, key, ...rest] = label.split(":");
    const val = rest.join(":");
    if (key === "value-type" && val) hints.valueType = val;
    if (key === "mandate") hints.mandate = true;
    if (key === "outcome" && val) hints.outcome = val;
    if (key === "area" && val) hints.area = val;
  }
  return hints;
}

/**
 * @param {object} issue — Jira REST issue
 * @param {object|null} property — looper.v1 issue property value
 */
export function jiraIssueToInitiative(issue, property = null) {
  const f = issue.fields || {};
  const hints = labelsToHints(f.labels);
  const stored = property?.value ?? property ?? {};
  const rubric = stored.rubric && typeof stored.rubric === "object" ? stored.rubric : stored;

  const area =
    rubric.area ||
    hints.area ||
    f.components?.[0]?.name ||
    issue.fields?.project?.key ||
    "Unassigned";

  const initiative = {
    id: issue.key,
    title: f.summary || issue.key,
    description: adfToText(f.description) || rubric.description || "",
    area,
    sponsor: rubric.sponsor || f.reporter?.displayName || f.assignee?.displayName || "Unknown",
    outcome: rubric.outcome || hints.outcome || f.summary || "",
    valueType: rubric.valueType || hints.valueType || VALUE_TYPES.ENABLER,
    mandate: rubric.mandate === true || hints.mandate === true,
    mandateCitation: rubric.mandateCitation,
    businessImpact: rubric.businessImpact,
    reach: rubric.reach || { value: 0, unit: "units", source: rubric.evidence?.reach },
    revenueImpact: rubric.revenueImpact,
    cogs: rubric.cogs,
    costSaveAnnual: rubric.costSaveAnnual,
    savingsEffectiveDate: rubric.savingsEffectiveDate,
    costAvoid: rubric.costAvoid,
    pAvoid: rubric.pAvoid,
    riskReduction: rubric.riskReduction,
    pRisk: rubric.pRisk,
    customerImpact: rubric.customerImpact,
    ongoingTCO: rubric.ongoingTCO,
    budgetCyclePosition: rubric.budgetCyclePosition,
    deliveryConfidence: rubric.deliveryConfidence ?? CONFIDENCE.MEDIUM,
    valueConfidence: rubric.valueConfidence ?? CONFIDENCE.MEDIUM,
    effortTeamWeeks: rubric.effortTeamWeeks ?? 0,
    talentProfile: rubric.talentProfile,
    dependsOn: rubric.dependsOn || [],
    evidence: rubric.evidence || {},
    state: rubric.state || STATES.DRAFT,
    _jira: {
      key: issue.key,
      status: f.status?.name,
      issueType: f.issuetype?.name,
      priority: f.priority?.name,
      updated: f.updated,
      url: `${process.env.JIRA_SITE || ""}/browse/${issue.key}`,
    },
  };

  // Auto-promote to Submitted when rubric validates
  const gate = validate(initiative);
  if (gate.ok && initiative.state === STATES.DRAFT) initiative.state = STATES.SUBMITTED;

  return initiative;
}

/** Pack prioritize output back into Jira property + labels. */
export function initiativeToJiraProperty(initiative, rankResult = {}) {
  const {
    _rank,
    _score,
    _tier,
    _funding,
    _priorityRaw,
    _intakeReceipt,
    _scoreReceipt,
    _breakdown,
    ...rubric
  } = initiative;

  return {
    version: PROPERTY_VERSION,
    rubric,
    snapshot: {
      rank: _rank ?? null,
      score: _score ?? null,
      tier: _tier ?? null,
      funding: _funding ?? null,
      priorityRaw: _priorityRaw ?? null,
      intakeReceipt: _intakeReceipt ?? null,
      scoreReceipt: _scoreReceipt ?? null,
      methodologyVersion: _breakdown?.methodologyVersion ?? null,
      syncedAt: new Date().toISOString(),
    },
    ...rankResult,
  };
}

export function jiraPriorityFromRank(rank, total) {
  if (rank == null) return null;
  const ratio = rank / Math.max(total, 1);
  if (ratio <= 0.15) return { name: "Highest" };
  if (ratio <= 0.35) return { name: "High" };
  if (ratio <= 0.65) return { name: "Medium" };
  if (ratio <= 0.85) return { name: "Low" };
  return { name: "Lowest" };
}

export function buildPushComment(initiative) {
  const lines = [
    `[LOOPER] Rank #${initiative._rank ?? "—"} · score ${initiative._score ?? "—"} · tier ${initiative._tier ?? "—"} · ${initiative._funding ?? "—"}`,
    `Receipt: ${(initiative._scoreReceipt || initiative._intakeReceipt || "").slice(0, 16)}…`,
    `Synced from LOOPER · ${new Date().toISOString()}`,
  ];
  return lines.join("\n");
}