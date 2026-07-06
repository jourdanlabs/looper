export function confluenceConfig() {
  const site = process.env.CONFLUENCE_SITE?.replace(/\/$/, "") || process.env.JIRA_SITE?.replace(/\/$/, "") || "";
  const email = process.env.CONFLUENCE_EMAIL || process.env.JIRA_EMAIL || "";
  const token = process.env.CONFLUENCE_API_TOKEN || process.env.JIRA_API_TOKEN || "";
  const spaceKey = process.env.CONFLUENCE_SPACE_KEY || "";
  const parentPageId = process.env.CONFLUENCE_PARENT_PAGE_ID || "";
  const publishPageId = process.env.CONFLUENCE_PUBLISH_PAGE_ID || "";

  const enabled = Boolean(site && email && token && spaceKey);

  return {
    enabled,
    site,
    email,
    token,
    spaceKey,
    parentPageId,
    publishPageId,
    baseUrl: site ? `${site}/wiki/rest/api` : "",
  };
}

export function confluenceAuthHeader(cfg) {
  const raw = `${cfg.email}:${cfg.token}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}