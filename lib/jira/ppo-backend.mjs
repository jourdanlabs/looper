// Governance backend — team/access/Product Context/automation requests (stub until credentials).

import { jiraConfig } from "./config.mjs";
import { stubCreateIssue, stubListIssues } from "./stub.mjs";
import { JIRA_PROJECTS } from "../types.mjs";
import { LEDGER_KINDS } from "../ledger.mjs";

/** Registry of PPO request types — extensible without engine changes. */
export const PPO_REQUEST_TYPES = Object.freeze([
  "add-team",
  "move-team",
  "remove-team",
  "add-team-member",
  "move-team-member",
  "remove-team-member",
  "elevate-access",
  "pat-context-add",
  "pat-context-update",
  "pat-context-remove",
  "automation-request",
]);

/**
 * Submit a governance request to the governance project.
 * @param {{ type: string, summary: string, details?: object, requester?: string }} req
 * @param {object} [opts]
 * @param {object} [opts.ledger]
 */
export async function submitPPORequest(req, opts = {}) {
  const cfg = jiraConfig();
  const project = cfg.ppoKey || JIRA_PROJECTS.GOV;

  if (!PPO_REQUEST_TYPES.includes(req.type)) {
    throw new Error(`Unknown PPO request type: ${req.type}`);
  }

  if (!cfg.enabled) {
    const issue = stubCreateIssue(
      project,
      {
        summary: req.summary,
        description: JSON.stringify(req.details ?? {}, null, 2),
        issuetype: "Request",
        labels: [`ppo-type:${req.type}`],
        status: "Awaiting Approval",
      },
      { ledger: opts.ledger }
    );

    if (opts.ledger) {
      opts.ledger.append(LEDGER_KINDS.PPO_REQUESTED, {
        jiraKey: issue.key,
        type: req.type,
        requester: req.requester ?? "unknown",
        mode: "stub",
      });
    }

    return { ok: true, mode: "stub", project, issue };
  }

  throw new Error("Governance live write not wired — stub mode active");
}

/** List governance requests (stub). */
export async function listPPORequests() {
  const cfg = jiraConfig();
  const project = cfg.ppoKey || JIRA_PROJECTS.GOV;

  if (!cfg.enabled) {
    return { mode: "stub", project, issues: stubListIssues(project) };
  }

  throw new Error("Governance live read not wired — stub mode active");
}