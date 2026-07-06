"use client";

// SpecStudio — the client surface for /spec (LOOPER Spec Authoring, CADMUS engine).
// Left: the funded queue (only funded items can be specced). Right: the CADMUS
// spec for the selected item — objective, acceptance criteria, non-goals,
// constraints, focused open questions — plus copy buttons for the spec doc and a
// grounded LLM prompt. Everything comes from GET /api/spec/[id]; nothing is
// invented client-side. Re-running the same item returns an identical receipt.

import { useCallback, useState } from "react";

export default function SpecStudio({ funded, refusedSample, head, verified, methodologyVersion }) {
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState("");

  const run = useCallback(async (item) => {
    setSelected(item.id);
    setData(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/spec/${item.id}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const copy = useCallback((which, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(""), 1600);
    });
  }, []);

  const spec = data?.spec;

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-gutter py-margin flex flex-col gap-margin">
      <header className="flex flex-col gap-unit" data-tour="spec-identity">
        <h1 className="font-headline-lg text-headline-lg text-primary">Spec Authoring</h1>
        <p className="font-data-mono text-data-mono text-on-surface-variant">
          FUNDED ITEM → BUILD-READY SPEC + GROUNDED PROMPT · SEALED ON THE CHAIN
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl mt-1">
          A funded initiative becomes an objective, real acceptance criteria, non-goals, constraints,
          and only the open questions that genuinely need a decision — deterministic, so the same item
          yields the same spec and the same receipt. Appended to the one ledger as{" "}
          <code className="font-data-mono">SPEC_DRAFTED</code>. Only funded work can be specced.
        </p>
        <p className="font-data-mono text-data-mono text-on-surface-variant mt-1">
          <span className={verified ? "text-secondary" : "text-error"}>
            {verified ? "CHAIN VERIFIED" : "CHAIN BROKEN"}
          </span>{" "}
          · HEAD {head.slice(0, 8) || "—"} · METHODOLOGY {methodologyVersion || "v1.0"}
        </p>
      </header>

      <div className="grid gap-margin lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] items-start">
        {/* ── Funded queue ─────────────────────────────────────────────── */}
        <section className="technical-border p-4 flex flex-col gap-3" data-tour="spec-queue">
          <h2 className="font-label-caps text-label-caps text-primary">FUNDED · {funded.length}</h2>
          {funded.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              Nothing funded this cycle — no items to spec.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {funded.map((it) => {
                const active = selected === it.id;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => run(it)}
                      aria-pressed={active}
                      className={`w-full text-left technical-border p-3 transition-colors ${
                        active ? "bg-surface-container border-primary" : "hover:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-data-mono text-data-mono text-on-surface-variant">
                          #{it.rank} · {it.id}
                        </span>
                        <span className="font-data-mono text-data-mono text-secondary">{it.score}</span>
                      </div>
                      <div className="font-body-md text-body-md text-primary mt-1">{it.title}</div>
                      <div className="font-data-mono text-data-mono text-on-surface-variant mt-1">
                        {it.area} · {it.effortTeamWeeks}wk
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {refusedSample && (
            <p className="font-data-mono text-data-mono text-on-surface-variant border-t border-outline pt-3 mt-1">
              {refusedSample.id} is {refusedSample.funding} — refused for spec. Spec follows funding.
            </p>
          )}
        </section>

        {/* ── Generated spec ───────────────────────────────────────────── */}
        <section className="technical-border p-5 min-h-[24rem]" data-tour="spec-output">
          {!selected && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              Select a funded item to draft its spec and a grounded build prompt.
            </p>
          )}
          {loading && (
            <p className="font-data-mono text-data-mono text-on-surface-variant animate-pulse">
              ● drafting spec · sealing receipt…
            </p>
          )}
          {error && <div className="font-data-mono text-data-mono text-error">REFUSED · {error}</div>}
          {spec && !loading && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-outline pb-3">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-primary">{data.initiative.title}</h2>
                  <p className="font-data-mono text-data-mono text-on-surface-variant mt-1">
                    {data.initiative.id} · #{data.initiative.rank} · score {data.initiative.score}
                  </p>
                </div>
                <span
                  className={`font-label-caps text-label-caps px-3 py-1 technical-border ${
                    data.verdict === "ready" ? "text-secondary" : "text-primary"
                  }`}
                >
                  {data.verdict === "ready" ? "READY" : "NEEDS INPUT"}
                </span>
              </div>

              <Block label="OBJECTIVE">
                <p className="font-body-md text-body-md text-primary">{spec.objective}</p>
                {(spec.audience || spec.role) && (
                  <p className="font-data-mono text-data-mono text-on-surface-variant mt-2">
                    {spec.audience}
                    {spec.audience && spec.role ? " · " : ""}
                    {spec.role ? `role: ${spec.role}` : ""}
                  </p>
                )}
              </Block>

              <List label="ACCEPTANCE CRITERIA" items={spec.acceptance} tone="primary" />
              <List label="NON-GOALS" items={spec.outOfScope} tone="muted" />
              {spec.constraints?.length > 0 && (
                <List label="CONSTRAINTS" items={spec.constraints} tone="muted" />
              )}
              {spec.open?.length > 0 && (
                <List label="OPEN QUESTIONS — RESOLVE BEFORE BUILD" items={spec.open} tone="open" />
              )}

              <div className="border-t border-outline pt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="font-data-mono text-data-mono text-on-surface-variant">
                  SPEC_DRAFTED · receipt {(data.receipt || "").slice(0, 12)} · head{" "}
                  {(data.head || "").slice(0, 8)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copy("spec", data.markdown)}
                    className="font-label-caps text-label-caps px-3 py-1 technical-border text-primary hover:bg-surface-container transition-colors"
                  >
                    {copied === "spec" ? "COPIED" : "COPY SPEC"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copy("prompt", data.prompt)}
                    className="font-label-caps text-label-caps px-3 py-1 technical-border text-primary hover:bg-surface-container transition-colors"
                  >
                    {copied === "prompt" ? "COPIED" : "COPY LLM PROMPT"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Block({ label, children }) {
  return (
    <div>
      <h3 className="font-label-caps text-label-caps text-primary mb-2">{label}</h3>
      {children}
    </div>
  );
}

function List({ label, items, tone }) {
  const toneClass =
    tone === "open" ? "text-primary" : tone === "muted" ? "text-on-surface-variant" : "text-primary";
  return (
    <div>
      <h3 className="font-label-caps text-label-caps text-primary mb-2">{label}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((t, i) => (
          <li key={i} className="technical-border p-3 flex gap-3">
            <span className="font-data-mono text-data-mono text-secondary shrink-0">
              {tone === "open" ? "?" : "—"}
            </span>
            <span className={`font-body-md text-body-md ${toneClass}`}>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
