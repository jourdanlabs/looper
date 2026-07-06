import { confluenceAuthHeader, confluenceConfig } from "./config.mjs";
import { adfToText } from "../jira/map.mjs";

export class ConfluenceError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "ConfluenceError";
    this.status = status;
    this.body = body;
  }
}

async function confluenceFetch(path, { method = "GET", body, cfg = confluenceConfig() } = {}) {
  if (!cfg.enabled) throw new ConfluenceError("Confluence is not configured");
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: confluenceAuthHeader(cfg),
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
    throw new ConfluenceError(`Confluence ${res.status}`, { status: res.status, body: data });
  }
  return data;
}

export async function confluenceHealth(cfg = confluenceConfig()) {
  if (!cfg.enabled) {
    return {
      ok: false,
      configured: false,
      reason: "Set CONFLUENCE_SITE (or JIRA_SITE), email/token, and CONFLUENCE_SPACE_KEY",
    };
  }
  try {
    const space = await confluenceFetch(`/space/${cfg.spaceKey}`, { cfg });
    return { ok: true, configured: true, space: space.name, key: space.key };
  } catch (err) {
    return { ok: false, configured: true, reason: err instanceof ConfluenceError ? err.message : String(err) };
  }
}

/** Fetch page by ID — returns title + plain text body. */
export async function confluenceGetPage(pageId, cfg = confluenceConfig()) {
  const page = await confluenceFetch(`/content/${pageId}?expand=body.storage,version`, { cfg });
  const html = page.body?.storage?.value || "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { id: page.id, title: page.title, text, version: page.version?.number ?? 1, url: `${cfg.site}/wiki/spaces/${cfg.spaceKey}/pages/${page.id}` };
}

/** Resolve a Confluence URL to page metadata (for evidence linking). */
export async function confluenceResolveUrl(url, cfg = confluenceConfig()) {
  const m = String(url).match(/\/pages\/(\d+)/);
  if (!m) return null;
  return confluenceGetPage(m[1], cfg);
}

function markdownToStorage(markdown) {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`);
  return paragraphs.join("");
}

/** Create or update the LOOPER readout page. */
export async function confluencePublishMarkdown(title, markdown, cfg = confluenceConfig()) {
  const storage = markdownToStorage(markdown);
  const pageId = cfg.publishPageId;

  if (pageId) {
    const current = await confluenceFetch(`/content/${pageId}?expand=version`, { cfg });
    return confluenceFetch(`/content/${pageId}`, {
      method: "PUT",
      cfg,
      body: {
        id: pageId,
        type: "page",
        title,
        space: { key: cfg.spaceKey },
        body: { storage: { value: storage, representation: "storage" } },
        version: { number: (current.version?.number ?? 1) + 1 },
      },
    });
  }

  return confluenceFetch("/content", {
    method: "POST",
    cfg,
    body: {
      type: "page",
      title,
      space: { key: cfg.spaceKey },
      ancestors: cfg.parentPageId ? [{ id: cfg.parentPageId }] : [],
      body: { storage: { value: storage, representation: "storage" } },
    },
  });
}

export { adfToText };