// Jira integration config — env-driven, stub mode when credentials absent.

import { JIRA_PROJECTS } from "../types.mjs";

const LOOPER_PROPERTY_KEY = "looper.v1";

export function jiraConfig() {
  const site = process.env.JIRA_SITE?.replace(/\/$/, "") || "";
  const email = process.env.JIRA_EMAIL || "";
  const token = process.env.JIRA_API_TOKEN || "";
  const projectKey = process.env.JIRA_PROJECT_KEY || "";
  const intakeKey = process.env.JIRA_INTAKE_PROJECT_KEY || JIRA_PROJECTS.INTAKE;
  const ppoKey = process.env.JIRA_PPO_PROJECT_KEY || JIRA_PROJECTS.GOV;
  const jql =
    process.env.JIRA_JQL ||
    (projectKey
      ? `project = ${projectKey} AND type in (Epic, Story, Initiative) AND statusCategory != Done ORDER BY updated DESC`
      : "");
  const enabled = Boolean(site && email && token && jql);

  return {
    enabled,
    mode: enabled ? "live" : "stub",
    site,
    email,
    token,
    projectKey,
    intakeKey,
    ppoKey,
    jql,
    propertyKey: LOOPER_PROPERTY_KEY,
    baseUrl: site ? `${site}/rest/api/3` : "",
    agileUrl: site ? `${site}/rest/agile/1.0` : "",
  };
}

export function jiraAuthHeader(cfg) {
  const raw = `${cfg.email}:${cfg.token}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}