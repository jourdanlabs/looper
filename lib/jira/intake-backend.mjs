// Intake backend — live Jira when configured, in-memory stub otherwise.

import { jiraConfig } from "./config.mjs";
import { stubCreateIssue, stubListIssues, stubRecordAutomation } from "./stub.mjs";
import { JIRA_PROJECTS } from "../types.mjs";

/**
 * Submit a structured intake item to the intake project.
 * @param {object} initiative  rubric-shaped payload
 * @param {object} [opts]
 * @param {object} [opts.ledger]  optional chain to append INTAKEN receipt
 */
export async function submitToIntake(initiative, opts = {}) {
  const cfg = jiraConfig();
  const project = cfg.intakeKey || JIRA_PROJECTS.INTAKE;

  if (!cfg.enabled) {
    const issue = stubCreateIssue(
      project,
      {
        summary: initiative.title,
        description: initiative.description ?? initiative.outcome,
        issuetype: initiative.level === "Epic" ? "Epic" : initiative.level === "UserStory" ? "Story" : "Initiative",
        labels: [
          `planning-group:${initiative.planningGroup ?? "unassigned"}`,
          `team:${initiative.team ?? "unassigned"}`,
        ],
        property: { rubric: initiative, source: "looper-intake" },
      },
      { ledger: opts.ledger }
    );

    if (opts.ledger && opts.runAutomations !== false) {
      stubRecordAutomation(opts.ledger, {
        rule: "triage-by-planning-group",
        issueKey: issue.key,
        action: `labeled planning-group:${initiative.planningGroup ?? "unassigned"}`,
      });
    }

    return { ok: true, mode: "stub", project, issue };
  }

  // Live path deferred until credentials land — caller should not reach here
  // without cfg.enabled; stub is the Phase 1 contract.
  throw new Error("Intake live write not wired — set JIRA_* env vars when ready");
}

/** List intake issues (stub or live). */
export async function listIntake() {
  const cfg = jiraConfig();
  const project = cfg.intakeKey || JIRA_PROJECTS.INTAKE;

  if (!cfg.enabled) {
    return { mode: "stub", project, issues: stubListIssues(project) };
  }

  throw new Error("Intake live read not wired — stub mode active");
}