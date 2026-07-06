// Spec Authoring engine (LOOPER module #10) — CADMUS.
//
// A funded initiative's structured fields map straight into a CADMUS spec: no
// narrative-guessing, no lossy adapter. Out comes a real spec (objective, real
// acceptance criteria, non-goals, constraints, focused open questions) AND a
// grounded, ready-to-paste LLM prompt. Deterministic, no model in the path,
// sealed on the one chain as SPEC_DRAFTED. Same funded item → identical receipt.

import crypto from "node:crypto";
import { buildSpec, specMarkdown, llmPrompt } from "./cadmus.ts";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const cap = (s) => {
  const t = String(s ?? "").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "";
};

/** Map a LOOPER Initiative onto CADMUS's structured input. */
function initiativeToCadmusInput(i) {
  const audience = [
    i.area,
    i.sponsor && `sponsored by ${i.sponsor}`,
    i.planningGroup && `${i.planningGroup}${i.team ? ` / ${i.team}` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Real acceptance criteria, derived from what the item actually asserts.
  const done = [];
  if (i.outcome) done.push(`${cap(i.outcome)} is delivered and independently verifiable`);
  if (i.mandate && i.mandateCitation) done.push(`Satisfies the mandate ${i.mandateCitation}`);
  if (i.reach?.value) done.push(`Impact is measured against reach: ${i.reach.value} ${i.reach.unit}`);
  if (i.valueType === "revenue" && i.revenueImpact)
    done.push("Modeled revenue impact is instrumented and tracked post-launch");
  if (i.valueType === "cost-save" && i.costSaveAnnual)
    done.push("Realized annual cost-save is measured against the modeled figure");

  // Real constraints.
  const constraints = [];
  if (Array.isArray(i.dependsOn) && i.dependsOn.length)
    constraints.push(`Depends on ${i.dependsOn.join(", ")} — these must land first`);
  if (i.effortTeamWeeks) constraints.push(`Delivery budget: ${i.effortTeamWeeks} team-weeks`);
  if ((i.deliveryConfidence ?? 1) < 1)
    constraints.push(`Delivery confidence ${i.deliveryConfidence} — de-risk unknowns before committing`);
  if ((i.valueConfidence ?? 1) < 1)
    constraints.push(`Value confidence ${i.valueConfidence} — instrument the outcome to confirm value`);
  if (i.budgetCyclePosition) constraints.push(`Budget cycle position: ${i.budgetCyclePosition}`);

  const nonGoals = [
    `Scope beyond the stated ${i.valueType || "target"} outcome`,
    `Work outside ${i.area}`,
  ];

  return {
    intent: i.outcome ? `${i.title}: ${cap(i.outcome)}` : i.title,
    audience,
    role: `a senior delivery lead on the ${i.team || i.area || "Platform"} team`,
    done: done.join("\n"),
    nonGoals: nonGoals.join("\n"),
    constraints: constraints.join("\n"),
    format: "",
  };
}

/** Item-specific gaps worth surfacing — real questions, not template noise. */
function itemGaps(i) {
  const gaps = [];
  if (i.reach && !i.reach.source)
    gaps.push(`Reach (${i.reach.value} ${i.reach.unit}) has no cited source — confirm the figure with the PO.`);
  if (i.mandate && i.mandateCitation && !/eff|effective|\b20\d{2}\b/i.test(i.mandateCitation))
    gaps.push(`Confirm the effective date and enforcement authority for ${i.mandateCitation}.`);
  const evidence = i.evidence && typeof i.evidence === "object" ? Object.keys(i.evidence) : [];
  if (evidence.length === 0)
    gaps.push("No evidence sources are attached to this item — attach the source docs before build.");
  return gaps;
}

/**
 * @param {import('./types.mjs').Initiative} initiative
 * @param {import('./ledger.mjs').Ledger} ledger
 */
export function runSpecOnInitiative(initiative, ledger) {
  const input = initiativeToCadmusInput(initiative);
  const spec = buildSpec(input);
  spec.open = [...spec.open, ...itemGaps(initiative)];

  const markdown = specMarkdown(spec);
  const prompt = llmPrompt(spec);
  const receipt = sha(markdown);
  const verdict = spec.open.length === 0 ? "ready" : "needs-input";

  const ledgerReceipt = ledger.append("SPEC_DRAFTED", {
    id: initiative.id,
    title: initiative.title,
    engine: "cadmus",
    spec_receipt: receipt,
    acceptance_count: spec.acceptance.length,
    non_goal_count: spec.outOfScope.length,
    constraint_count: spec.constraints.length,
    open_count: spec.open.length,
    verdict,
  });

  return {
    spec,
    markdown,
    prompt,
    verdict,
    receipt,
    ledgerReceipt,
    head: ledger.head?.sha ?? null,
  };
}
