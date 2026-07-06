"use client";

import { useEffect, useState } from "react";

export default function IntegrationsPage() {
  const [jira, setJira] = useState(null);
  const [confluence, setConfluence] = useState(null);
  const [busy, setBusy] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [lastPush, setLastPush] = useState(null);
  const [lastPublish, setLastPublish] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/jira/health").then((r) => r.json()).then(setJira).catch(() => setJira({ ok: false }));
    fetch("/api/confluence/health").then((r) => r.json()).then(setConfluence).catch(() => setConfluence({ ok: false }));
  }, []);

  async function run(action, url) {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      if (action === "sync") setLastSync(data);
      if (action === "push") setLastPush(data);
      if (action === "publish") setLastPublish(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="wrap py-8 space-y-8 max-w-3xl">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">INTEGRATIONS</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md">
          Functional v1 — Jira as initiative source, Confluence for cabinet readout publish.
          Configure via environment variables on the deployment.
        </p>
      </header>

      {error ? (
        <div className="technical-border p-4 font-data-mono text-data-mono text-error">{error}</div>
      ) : null}

      <section className="technical-border p-4 space-y-4">
        <h2 className="font-label-caps text-label-caps text-primary">JIRA</h2>
        <div className="font-data-mono text-data-mono text-sm text-on-surface-variant space-y-1">
          <div>
            Status:{" "}
            {jira?.mode === "stub"
              ? "STUB (INTAKE/GOV in-memory)"
              : jira?.ok
                ? "CONNECTED"
                : jira?.configured
                  ? "ERROR"
                  : "NOT CONFIGURED"}
          </div>
          {jira?.mode === "stub" && jira?.projects ? (
            <div>
              Stub issues: INTAKE {jira.projects.INTAKE ?? 0} · GOV {jira.projects.GOV ?? 0}
            </div>
          ) : null}
          {jira?.account ? <div>Account: {jira.account}</div> : null}
          {jira?.site ? <div>Site: {jira.site}</div> : null}
          {jira?.jql ? <div>JQL: {jira.jql}</div> : null}
          {jira?.issueCount != null ? <div>Issues in scope: {jira.issueCount}</div> : null}
          {jira?.reason ? <div className="text-error">{jira.reason}</div> : null}
        </div>
        <p className="text-sm text-on-surface-variant">
          Rubric fields live in issue property <code className="font-data-mono">looper.v1</code>. Push writes rank,
          score, tier, and receipts back to Jira.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={jira?.mode === "stub" || !jira?.ok || busy}
            onClick={() => run("sync", "/api/jira/sync")}
            className="font-label-caps text-label-caps border border-primary px-4 py-2 hover:bg-surface-container disabled:opacity-40"
          >
            {busy === "sync" ? "SYNCING…" : "PULL FROM JIRA"}
          </button>
          <button
            type="button"
            disabled={!jira?.ok || busy}
            onClick={() => run("push", "/api/jira/push")}
            className="font-label-caps text-label-caps border border-primary px-4 py-2 hover:bg-surface-container disabled:opacity-40"
          >
            {busy === "push" ? "PUSHING…" : "PUSH RANKINGS TO JIRA"}
          </button>
        </div>
        {lastSync ? (
          <pre className="font-data-mono text-xs overflow-auto bg-surface-container-lowest p-3 border border-primary/20">
            {JSON.stringify(lastSync, null, 2)}
          </pre>
        ) : null}
        {lastPush ? (
          <pre className="font-data-mono text-xs overflow-auto bg-surface-container-lowest p-3 border border-primary/20">
            {JSON.stringify(lastPush, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="technical-border p-4 space-y-4">
        <h2 className="font-label-caps text-label-caps text-primary">CONFLUENCE</h2>
        <div className="font-data-mono text-data-mono text-sm text-on-surface-variant space-y-1">
          <div>Status: {confluence?.ok ? "CONNECTED" : confluence?.configured ? "ERROR" : "NOT CONFIGURED"}</div>
          {confluence?.space ? <div>Space: {confluence.space}</div> : null}
          {confluence?.reason ? <div className="text-error">{confluence.reason}</div> : null}
        </div>
        <button
          type="button"
          disabled={!confluence?.ok || busy}
          onClick={() => run("publish", "/api/confluence/publish")}
          className="font-label-caps text-label-caps border border-primary px-4 py-2 hover:bg-surface-container disabled:opacity-40"
        >
          {busy === "publish" ? "PUBLISHING…" : "PUBLISH CABINET READOUT"}
        </button>
        {lastPublish ? (
          <pre className="font-data-mono text-xs overflow-auto bg-surface-container-lowest p-3 border border-primary/20">
            {JSON.stringify(lastPublish, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="font-data-mono text-data-mono text-xs text-on-surface-variant space-y-2">
        <div className="font-label-caps text-label-caps text-primary text-sm">ENV VARS</div>
        <div>JIRA_SITE, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY or JIRA_JQL</div>
        <div>CONFLUENCE_SPACE_KEY, CONFLUENCE_PARENT_PAGE_ID, CONFLUENCE_PUBLISH_PAGE_ID (optional)</div>
        <div>Uses same Atlassian API token as Jira when Confluence-specific vars omitted.</div>
      </section>
    </main>
  );
}