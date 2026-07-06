// Jira ↔ LOOPER sync orchestration.

import { jiraConfig } from "./config.mjs";
import {
  jiraSearchAll,
  jiraGetIssueProperty,
  jiraSetIssueProperty,
  jiraAddComment,
  jiraUpdateIssue,
} from "./client.mjs";
import {
  jiraIssueToInitiative,
  initiativeToJiraProperty,
  jiraPriorityFromRank,
  buildPushComment,
} from "./map.mjs";
import { prioritize } from "../engine.mjs";

/** Pull Jira issues and map to Initiative[]. */
export async function pullInitiativesFromJira(cfg = jiraConfig()) {
  const issues = await jiraSearchAll(cfg);
  const initiatives = [];

  for (const issue of issues) {
    const prop = await jiraGetIssueProperty(issue.key, cfg.propertyKey, cfg);
    const value = prop?.value ?? null;
    initiatives.push(jiraIssueToInitiative(issue, value));
  }

  return {
    source: "jira",
    count: initiatives.length,
    initiatives,
    syncedAt: new Date().toISOString(),
    jql: cfg.jql,
  };
}

/** Push prioritize() results back to Jira (properties + optional priority + comment). */
export async function pushRankingsToJira(initiatives, opts = {}, cfg = jiraConfig()) {
  const result = prioritize(initiatives, opts);
  const ranked = result.ranked;
  const total = ranked.length;
  const updates = [];
  const errors = [];

  for (const it of ranked) {
    if (!it._jira?.key && !String(it.id).includes("-")) continue;
    const key = it._jira?.key || it.id;

    try {
      const property = initiativeToJiraProperty(it, {
        head: result.head,
        methodologyVersion: result.methodology_version,
      });
      await jiraSetIssueProperty(key, cfg.propertyKey, property, cfg);

      const priority = jiraPriorityFromRank(it._rank, total);
      if (priority && process.env.JIRA_PUSH_PRIORITY !== "false") {
        try {
          await jiraUpdateIssue(key, { priority }, cfg);
        } catch {
          // Priority names vary by site — non-fatal
        }
      }

      if (process.env.JIRA_PUSH_COMMENTS !== "false") {
        await jiraAddComment(key, buildPushComment(it), cfg);
      }

      updates.push({ key, rank: it._rank, score: it._score, tier: it._tier });
    } catch (err) {
      errors.push({ key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    ok: errors.length === 0,
    updated: updates.length,
    errors,
    updates,
    head: result.head,
    verify: result.verify,
  };
}