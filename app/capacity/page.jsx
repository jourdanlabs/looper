// /capacity — utilization by Planning Group (LOOPER Capacity module).

import { runPrioritize } from "../../lib/store/run.mjs";
import { buildEngineerRoster } from "../../lib/team-roster.mjs";
import EngineerRoster from "../../components/capacity/EngineerRoster.jsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Capacity · LOOPER" };

export default async function CapacityPage() {
  const { result: r, meta } = await runPrioritize({ capacity: 12 });
  const cv = r.capacityView;
  const roster = buildEngineerRoster();

  return (
    <main className="wrap py-8 space-y-8">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">CAPACITY</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Capacity and utilization by Planning Group. Every benched item carries{" "}
          <code className="font-data-mono">capacity_at_decision</code> on its receipt — &quot;why
          benched&quot; is a number, not an opinion.
        </p>
        <p className="mt-1 font-data-mono text-data-mono text-sm text-on-surface-variant">
          {meta.mode ?? "seed"} · total capacity {cv.capacity} team-slots
        </p>
      </header>

      <section className="technical-border p-4 grid gap-4 md:grid-cols-3">
        <div>
          <div className="font-label-caps text-label-caps text-on-surface-variant">USED</div>
          <div className="font-headline-sm text-headline-sm text-primary mt-1">
            {cv.totalTeamsUsed} / {cv.capacity}
          </div>
        </div>
        <div>
          <div className="font-label-caps text-label-caps text-on-surface-variant">HEADROOM</div>
          <div className="font-headline-sm text-headline-sm text-primary mt-1">{cv.headroom}</div>
        </div>
        <div>
          <div className="font-label-caps text-label-caps text-on-surface-variant">UTILIZATION</div>
          <div
            className={`font-headline-sm text-headline-sm mt-1 ${
              cv.utilizationPct > 90 ? "text-error" : "text-secondary"
            }`}
          >
            {cv.utilizationPct}%
          </div>
        </div>
      </section>

      <section className="technical-border p-4">
        <h2 className="font-label-caps text-label-caps text-primary mb-4">BY PLANNING GROUP</h2>
        <table className="w-full font-data-mono text-data-mono text-sm">
          <thead>
            <tr className="text-left border-b border-primary">
              <th className="py-2 pr-4">PLANNING GROUP</th>
              <th className="py-2 pr-4">ITEMS</th>
              <th className="py-2 pr-4">FUNDED</th>
              <th className="py-2 pr-4">BENCHED</th>
              <th className="py-2 pr-4">TEAMS USED</th>
              <th className="py-2 pr-4">FUNDED NPV</th>
              <th className="py-2">UTIL %</th>
            </tr>
          </thead>
          <tbody>
            {cv.byPlanningGroup.map((row) => (
              <tr key={row.planningGroup} className="border-b border-outline-variant">
                <td className="py-2 pr-4">{row.planningGroup}</td>
                <td className="py-2 pr-4">{row.items}</td>
                <td className="py-2 pr-4">{row.funded}</td>
                <td className="py-2 pr-4">{row.benched}</td>
                <td className="py-2 pr-4">{row.teamsUsed}</td>
                <td className="py-2 pr-4">${(row.fundedNpv / 1_000_000).toFixed(2)}M</td>
                <td className="py-2">{row.utilizationPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <EngineerRoster roster={roster} />
    </main>
  );
}