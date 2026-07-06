// /prioritize — Rescore All + ranking publish (LOOPER Prioritization module).

import { rescoreAll } from "../../lib/ranking.mjs";
import { loadInitiatives } from "../../lib/store/initiatives.mjs";
import { LEVEL_LIST } from "../../lib/types.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prioritize · LOOPER" };

export default async function PrioritizePage() {
  const { initiatives, meta } = await loadInitiatives();
  const published = rescoreAll(initiatives, {
    capacity: 12,
    who: "looper",
    why: "scheduled rescore all",
  });

  const byLevel = Object.fromEntries(LEVEL_LIST.map((l) => [l, 0]));
  for (const it of published.ranked) {
    byLevel[it.level] = (byLevel[it.level] ?? 0) + 1;
  }

  return (
    <main className="wrap py-8 space-y-8">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">PRIORITIZE</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Rescore all open backlog into a single stack-ranked list. Deterministic math — not a
          black box. Publish writes <code className="font-data-mono">RANKING_PUBLISHED</code> to
          the chain.
        </p>
        <p className="mt-1 font-data-mono text-data-mono text-sm text-on-surface-variant">
          Source: {meta.mode ?? "seed"} · {meta.reason ?? ""}
        </p>
      </header>

      <section className="technical-border p-4 grid gap-4 md:grid-cols-4">
        <Stat label="OPEN ITEMS" value={published.ranking.length} />
        <Stat label="FUNDED" value={published.stats.funded} />
        <Stat label="CHAIN HEAD" value={published.head?.slice(0, 12) ?? "—"} mono />
        <Stat
          label="VERIFY"
          value={published.verify.ok ? "OK" : "BROKEN"}
          accent={published.verify.ok}
        />
      </section>

      <section className="technical-border p-4">
        <h2 className="font-label-caps text-label-caps text-primary mb-3">BY LEVEL</h2>
        <div className="flex flex-wrap gap-4 font-data-mono text-data-mono text-sm">
          {LEVEL_LIST.map((l) => (
            <span key={l}>
              {l}: {byLevel[l]}
            </span>
          ))}
        </div>
      </section>

      <section className="technical-border p-4">
        <h2 className="font-label-caps text-label-caps text-primary mb-4">
          STACK RANK · receipt {published.rankingReceipt?.slice(0, 12)}
        </h2>
        <table className="w-full font-data-mono text-data-mono text-sm">
          <thead>
            <tr className="text-left border-b border-primary">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">LEVEL</th>
              <th className="py-2 pr-4">PLANNING GROUP</th>
              <th className="py-2 pr-4">SCORE</th>
              <th className="py-2">TIER</th>
            </tr>
          </thead>
          <tbody>
            {published.ranking.slice(0, 20).map((row) => (
              <tr key={row.id} className="border-b border-outline-variant">
                <td className="py-2 pr-4">{row.rank}</td>
                <td className="py-2 pr-4">{row.id}</td>
                <td className="py-2 pr-4">{row.level}</td>
                <td className="py-2 pr-4">{row.planningGroup}</td>
                <td className="py-2 pr-4">{Math.round(row.score)}</td>
                <td className="py-2">{row.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {published.ranking.length > 20 ? (
          <p className="mt-2 text-on-surface-variant text-sm">
            Showing top 20 of {published.ranking.length} — full list on /backlog
          </p>
        ) : null}
      </section>
    </main>
  );
}

function Stat({ label, value, mono, accent }) {
  return (
    <div>
      <div className="font-label-caps text-label-caps text-on-surface-variant">{label}</div>
      <div
        className={`mt-1 text-xl ${mono ? "font-data-mono text-data-mono" : "font-headline-sm text-headline-sm"} ${
          accent ? "text-secondary" : "text-primary"
        }`}
      >
        {value}
      </div>
    </div>
  );
}