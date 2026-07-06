"use client";

import { useEffect, useState } from "react";

export default function PPOClient({ types }) {
  const [requests, setRequests] = useState([]);
  const [type, setType] = useState(types[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [requester, setRequester] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/ppo");
    const data = await res.json();
    if (data.ok) setRequests(data.requests);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ppo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, summary, requester: requester || "operator" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "submit failed");
      setSummary("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function approve(id) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ppo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approver: "committee" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "approve failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="technical-border p-4 font-data-mono text-data-mono text-error">{error}</div>
      ) : null}

      <form onSubmit={submit} className="technical-border p-4 space-y-4 max-w-xl">
        <h2 className="font-label-caps text-label-caps text-primary">NEW REQUEST</h2>
        <label className="block space-y-1">
          <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">TYPE</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-primary px-3 py-2 font-data-mono text-data-mono text-sm bg-surface"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">SUMMARY</span>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            className="w-full border border-primary px-3 py-2 font-data-mono text-data-mono text-sm bg-surface"
          />
        </label>
        <label className="block space-y-1">
          <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">REQUESTER</span>
          <input
            value={requester}
            onChange={(e) => setRequester(e.target.value)}
            placeholder="operator"
            className="w-full border border-primary px-3 py-2 font-data-mono text-data-mono text-sm bg-surface"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="font-label-caps text-label-caps border border-primary px-4 py-2 hover:bg-surface-container disabled:opacity-40"
        >
          {busy ? "SUBMITTING…" : "SUBMIT REQUEST"}
        </button>
      </form>

      <section className="technical-border p-4">
        <h2 className="font-label-caps text-label-caps text-primary mb-4">REQUEST QUEUE</h2>
        {requests.length === 0 ? (
          <p className="font-data-mono text-data-mono text-sm text-on-surface-variant">No requests yet</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="border-b border-outline-variant pb-3 font-data-mono text-data-mono text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    {r.id} · {r.typeLabel}
                  </span>
                  <span className={r.status === "Approved" ? "text-secondary" : "text-on-surface-variant"}>
                    {r.status}
                  </span>
                </div>
                <div className="mt-1 text-on-surface-variant">{r.summary}</div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  {r.requester} · {r.createdAt}
                </div>
                {r.status === "Awaiting Approval" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => approve(r.id)}
                    className="mt-2 font-label-caps text-label-caps text-xs border border-primary px-3 py-1 hover:bg-surface-container disabled:opacity-40"
                  >
                    APPROVE
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}