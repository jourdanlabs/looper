// Jira REST API v3 client — server-side only.

import { jiraAuthHeader, jiraConfig } from "./config.mjs";
import { stubStats } from "./stub.mjs";

export class JiraError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "JiraError";
    this.status = status;
    this.body = body;
  }
}

async function jiraFetch(path, { method = "GET", body, cfg = jiraConfig() } = {}) {
  if (!cfg.enabled) throw new JiraError("Jira is not configured");
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: jiraAuthHeader(cfg),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new JiraError(`Jira ${res.status}: ${typeof data === "object" ? data?.errorMessages?.join("; ") || data?.message : text}`, {
      status: res.status,
      body: data,
    });
  }
  return data;
}

/** Connection health — live credentials or stub mode. */
export async function jiraHealth(cfg = jiraConfig()) {
  if (!cfg.enabled) {
    const stub = stubStats();
    return {
      ok: true,
      configured: false,
      mode: "stub",
      reason: "Stub mode — intake/governance in-memory until JIRA_SITE, JIRA_EMAIL, JIRA_API_TOKEN are set",
      intakeKey: cfg.intakeKey,
      ppoKey: cfg.ppoKey,
      ...stub,
    };
  }
  try {
    const me = await jiraFetch("/myself", { cfg });
    const search = await jiraFetch("/search", {
      method: "POST",
      body: { jql: cfg.jql, maxResults: 1, fields: ["key"] },
      cfg,
    });
    return {
      ok: true,
      configured: true,
      account: me.displayName || me.emailAddress,
      issueCount: search.total ?? search.issues?.length ?? 0,
      jql: cfg.jql,
      site: cfg.site,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      reason: err instanceof JiraError ? err.message : String(err),
    };
  }
}

/** Paginated JQL search — returns raw issues. */
export async function jiraSearchAll(cfg = jiraConfig(), { maxResults = 100 } = {}) {
  const fields = [
    "summary",
    "description",
    "status",
    "priority",
    "labels",
    "components",
    "reporter",
    "assignee",
    "issuetype",
    "parent",
    "created",
    "updated",
  ].join(",");

  const issues = [];
  let startAt = 0;
  const pageSize = Math.min(maxResults, 50);

  while (issues.length < maxResults) {
    const data = await jiraFetch("/search", {
      method: "POST",
      body: { jql: cfg.jql, startAt, maxResults: pageSize, fields: fields.split(",") },
      cfg,
    });
    const batch = data.issues || [];
    issues.push(...batch);
    if (batch.length < pageSize || issues.length >= (data.total ?? issues.length)) break;
    startAt += batch.length;
  }

  return issues.slice(0, maxResults);
}

export async function jiraGetIssueProperty(issueKey, propertyKey, cfg = jiraConfig()) {
  try {
    return await jiraFetch(`/issue/${issueKey}/properties/${propertyKey}`, { cfg });
  } catch (err) {
    if (err instanceof JiraError && err.status === 404) return null;
    throw err;
  }
}

export async function jiraSetIssueProperty(issueKey, propertyKey, value, cfg = jiraConfig()) {
  return jiraFetch(`/issue/${issueKey}/properties/${propertyKey}`, {
    method: "PUT",
    body: value,
    cfg,
  });
}

export async function jiraAddComment(issueKey, body, cfg = jiraConfig()) {
  return jiraFetch(`/issue/${issueKey}/comment`, {
    method: "POST",
    body: {
      body: {
        type: "doc",
        version: 1,
        content: [{ type: "paragraph", content: [{ type: "text", text: body }] }],
      },
    },
    cfg,
  });
}

export async function jiraUpdateIssue(issueKey, fields, cfg = jiraConfig()) {
  return jiraFetch(`/issue/${issueKey}`, { method: "PUT", body: { fields }, cfg });
}