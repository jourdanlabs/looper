// Jira stub — in-memory intake + governance backends when credentials are absent.
//
// Runs fully functional until the client delivers API tokens. Issues persist
// for the process lifetime (demo); production would swap to live REST.

import { JIRA_PROJECTS } from "../types.mjs";
import { LEDGER_KINDS, sha } from "../ledger.mjs";

const stores = {
  [JIRA_PROJECTS.INTAKE]: [],
  [JIRA_PROJECTS.GOV]: [],
};

let seq = 1;

function nextKey(project) {
  const n = seq++;
  return `${project}-${n}`;
}

/** Create a stub issue; returns { key, fields, createdAt }. */
export function stubCreateIssue(project, fields, { ledger } = {}) {
  if (!stores[project]) throw new Error(`Unknown Jira project: ${project}`);

  const issue = {
    key: nextKey(project),
    project,
    fields: {
      summary: fields.summary ?? "(untitled)",
      description: fields.description ?? "",
      issuetype: { name: fields.issuetype ?? "Task" },
      labels: fields.labels ?? [],
      status: { name: fields.status ?? "Open" },
      ...fields,
    },
    property: fields.property ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  stores[project].push(issue);

  if (ledger) {
    const kind =
      project === JIRA_PROJECTS.GOV
        ? LEDGER_KINDS.PPO_REQUESTED
        : LEDGER_KINDS.INTAKEN;
    ledger.append(kind, {
      jiraKey: issue.key,
      project,
      summary: issue.fields.summary,
      mode: "stub",
    });
  }

  return issue;
}

/** List stub issues for a project. */
export function stubListIssues(project) {
  return [...(stores[project] ?? [])];
}

/** Stub store stats for health checks. */
export function stubStats() {
  return {
    mode: "stub",
    projects: {
      [JIRA_PROJECTS.INTAKE]: stores[JIRA_PROJECTS.INTAKE].length,
      [JIRA_PROJECTS.GOV]: stores[JIRA_PROJECTS.GOV].length,
    },
  };
}

/** Reset stub stores (tests only). */
export function stubReset() {
  for (const k of Object.keys(stores)) stores[k].length = 0;
  seq = 1;
}

/** Record a backlog automation firing on the chain. */
export function stubRecordAutomation(ledger, { rule, issueKey, action }) {
  return ledger.append(LEDGER_KINDS.BACKLOG_AUTOMATION, {
    rule,
    issueKey,
    action,
    mode: "stub",
    sha: sha(JSON.stringify({ rule, issueKey, action })).slice(0, 12),
  });
}