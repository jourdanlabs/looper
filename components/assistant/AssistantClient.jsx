"use client";

import { useState } from "react";

const SUGGESTIONS = [
  "How many funded items?",
  "Capacity utilization",
  "Rank of INIT-001",
  "Planning group Growth capacity",
  "Flow throughput and cycle time",
  "STRATA reconcile status",
  "Product context",
  "How does dial governance work?",
  "Who knows pricing APIs?",
  "Engineer skillset for trust & safety",
];

export default function AssistantClient() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(q) {
    const text = q ?? question;
    if (!text.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      setResult(data);
      if (q) setQuestion(q);
    } catch (err) {
      setResult({ ok: false, refused: true, reason: String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="technical-border p-4 space-y-3"
      >
        <label className="block space-y-1">
          <span className="font-label-caps text-label-caps text-on-surface-variant text-xs">QUESTION</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about rank, capacity, metrics, docs, product context…"
            className="w-full border border-primary px-3 py-2 font-data-mono text-data-mono text-sm bg-surface"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="font-label-caps text-label-caps border border-primary px-4 py-2 hover:bg-surface-container disabled:opacity-40"
        >
          {busy ? "GROUNDING…" : "ASK"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => run(s)}
            className="font-data-mono text-data-mono text-xs border border-outline-variant px-2 py-1 hover:bg-surface-container"
          >
            {s}
          </button>
        ))}
      </div>

      {result ? (
        <div className={`technical-border p-4 ${result.ok ? "" : "border-error"}`}>
          {result.ok ? (
            <>
              <p className="font-body-md text-body-md text-on-surface">{result.answer}</p>
              <div className="mt-4 space-y-1">
                <div className="font-label-caps text-label-caps text-on-surface-variant text-xs">CITATIONS</div>
                {result.citations.map((c, i) => (
                  <div key={i} className="font-data-mono text-data-mono text-xs text-on-surface-variant">
                    {c.source}
                    {c.receipt ? ` · receipt ${String(c.receipt).slice(0, 12)}` : ""}
                    {c.fingerprint ? ` · fp ${c.fingerprint}` : ""}
                    {c.head ? ` · head ${String(c.head).slice(0, 12)}` : ""}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="font-data-mono text-data-mono text-sm text-error">
              REFUSED — {result.reason ?? result.error ?? "no sourced answer"}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}