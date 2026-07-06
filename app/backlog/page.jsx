// /backlog — All / Planning Group / Team views (regenerated from engine).

import { runPrioritize } from "../../lib/store/run.mjs";
import { PLANNING_GROUP_LIST, TEAM_LIST } from "../../lib/types.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Backlog · LOOPER" };

export default async function BacklogPage() {
  const { result: r } = await runPrioritize({ capacity: 12 });
  const views = r.backlog;

  return (
    <main className="wrap py-8 space-y-10">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">BACKLOG</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Standard views by All, Planning Group, and Team. Every row carries rank + score from the
          chain — cannot go stale.
        </p>
      </header>

      <BacklogTable title="ALL" rows={views.all} count={views.counts.all} />

      <div className="space-y-6">
        <h2 className="font-label-caps text-label-caps text-primary">BY PLANNING GROUP</h2>
        {PLANNING_GROUP_LIST.map((pg) => (
          <BacklogTable
            key={pg}
            title={pg}
            rows={views.byPlanningGroup[pg] ?? []}
            count={views.counts.planningGroups[pg] ?? 0}
            compact
          />
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="font-label-caps text-label-caps text-primary">BY TEAM</h2>
        {TEAM_LIST.map((team) => (
          <BacklogTable
            key={team}
            title={team}
            rows={views.byTeam[team] ?? []}
            count={views.counts.teams[team] ?? 0}
            compact
          />
        ))}
      </div>
    </main>
  );
}

function BacklogTable({ title, rows, count, compact }) {
  const show = compact ? rows.slice(0, 8) : rows;
  return (
    <section className="technical-border p-4">
      <h3 className="font-label-caps text-label-caps text-primary mb-3">
        {title} <span className="text-on-surface-variant">({count})</span>
      </h3>
      {show.length === 0 ? (
        <p className="font-data-mono text-data-mono text-sm text-on-surface-variant">No items</p>
      ) : (
        <table className="w-full font-data-mono text-data-mono text-sm">
          <thead>
            <tr className="text-left border-b border-primary">
              <th className="py-1 pr-3">#</th>
              <th className="py-1 pr-3">ID</th>
              <th className="py-1 pr-3">LEVEL</th>
              <th className="py-1 pr-3">TITLE</th>
              <th className="py-1 pr-3">SCORE</th>
              <th className="py-1">FUNDING</th>
            </tr>
          </thead>
          <tbody>
            {show.map((row) => (
              <tr key={row.id} className="border-b border-outline-variant">
                <td className="py-1 pr-3">{row.rank}</td>
                <td className="py-1 pr-3">{row.id}</td>
                <td className="py-1 pr-3">{row.level}</td>
                <td className="py-1 pr-3 truncate max-w-xs">{row.title}</td>
                <td className="py-1 pr-3">{Math.round(row.score)}</td>
                <td className="py-1">{row.funding}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {compact && rows.length > 8 ? (
        <p className="mt-2 text-on-surface-variant text-xs">+{rows.length - 8} more</p>
      ) : null}
    </section>
  );
}