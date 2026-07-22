// /triage — intake → base score → pillar triage (the 2-day launch discipline).
//
// Each request is scored by the BUSINESS-CASE-INDEPENDENT base score, routed to a
// pillar owner, and given a suggested Accept / Kill / Requires-Discovery. The
// suggestion is deterministic and explainable; the pillar lead makes the call.

import { scoreRequest } from "../../lib/base-score.mjs";
import { triageAll, PILLARS } from "../../lib/triage.mjs";
import { SAMPLE_REQUESTS } from "../../seed/sample-requests.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Triage · LOOPER" };

const CHIP = {
  Accept: "bg-green-100 text-green-900 border-green-300",
  Kill: "bg-red-100 text-red-900 border-red-300",
  "Requires Discovery": "bg-amber-100 text-amber-900 border-amber-300",
};
const ICON = { Accept: "✅", Kill: "⛔", "Requires Discovery": "🔎" };

export default async function TriagePage() {
  // Score every request WITHOUT its business case first; attach the modifier only
  // where a business case exists (kept separate on purpose).
  const scored = SAMPLE_REQUESTS.map((s) => ({
    ...s,
    ...scoreRequest(s.answers ?? s, s.businessCase ? { businessCase: s.businessCase } : {}),
  }));
  const t = triageAll(scored);
  const pillarOrder = [...PILLARS, "Unassigned"].filter((p) => t.byPillar[p]?.length);

  return (
    <main className="wrap py-8 space-y-8">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">TRIAGE</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Every request gets one consistent score at intake — <strong>independent of the
          business case</strong>. If a business case arrives later it <em>modifies</em> the
          score, never the framework. Items route to a pillar owner with a suggested
          <span className="font-data-mono"> do / kill / discover</span>. The suggestion is a
          deterministic, explainable starting point — the pillar lead decides.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 font-data-mono text-sm">
          <span className="rounded border border-green-300 bg-green-100 px-2 py-0.5 text-green-900">{t.counts["Accept"] || 0} accept</span>
          <span className="rounded border border-red-300 bg-red-100 px-2 py-0.5 text-red-900">{t.counts["Kill"] || 0} kill</span>
          <span className="rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-amber-900">{t.counts["Requires Discovery"] || 0} discovery</span>
        </div>
      </header>

      {pillarOrder.map((pillar) => (
        <section key={pillar} className="space-y-3">
          <h2 className="font-headline-xs text-lg font-semibold text-primary border-b border-outline-variant pb-1">
            {pillar}
            <span className="ml-2 font-data-mono text-sm font-normal text-on-surface-variant">
              {t.byPillar[pillar].length} item{t.byPillar[pillar].length === 1 ? "" : "s"}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.byPillar[pillar].map((r) => {
              const item = scored.find((s) => s.id === r.id);
              const bc = item?.businessCaseApplied;
              return (
                <article key={r.id} className="rounded-lg border border-outline-variant bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-data-mono text-xs text-on-surface-variant">{r.id}</div>
                      <div className="font-body-md text-body-md font-medium text-on-surface">{r.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-data-mono text-2xl font-bold text-primary leading-none">{r.score}</div>
                      {bc ? (
                        <div className="font-data-mono text-[10px] text-on-surface-variant">
                          base {item.baseScore} +case
                        </div>
                      ) : (
                        <div className="font-data-mono text-[10px] text-on-surface-variant">base</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-data-mono text-xs ${CHIP[r.suggested]}`}>
                      {ICON[r.suggested]} {r.suggested}
                    </span>
                    {r.pmRequired ? (
                      <span className="rounded border border-outline-variant px-2 py-0.5 font-data-mono text-[10px] text-on-surface-variant">PM</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">{r.reason}</p>
                  {item?.unanswered?.length ? (
                    <p className="mt-1 font-data-mono text-[11px] text-amber-800">
                      ⚠ unanswered: {item.unanswered.join(", ")}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="pt-4 border-t border-outline-variant">
        <p className="font-data-mono text-sm text-on-surface-variant">
          Deterministic: same answers → same score → same receipt, every run. That reproducibility
          is the shadow-test wedge — run <code>node cli.mjs shadow</code> for the variance report vs.
          the LLM. Suggestions here are advisory; the pillar lead owns the decision.
        </p>
      </footer>
    </main>
  );
}
