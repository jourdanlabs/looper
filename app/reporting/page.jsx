// /reporting — STRATA semantic layer over the Portfolio extract.

import { runPrioritize } from "../../lib/store/run.mjs";
import { buildStrataReport } from "../../lib/strata/report.mjs";
import { MASTER_EXTRACT_VERSION } from "../../seed/master-extract.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reporting · LOOPER" };

export default async function ReportingPage() {
  const { result: r } = await runPrioritize({ capacity: 12 });
  const report = buildStrataReport(r);

  return (
    <main className="wrap py-8 space-y-8">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">REPORTING</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          STRATA semantic layer over the Portfolio extract. Numbers reconcile across JIRA, Align, and
          Finance — or refuse. Every cell carries a VELLUM fingerprint.
        </p>
        <p className="mt-1 font-data-mono text-data-mono text-sm text-on-surface-variant">
          Extract {MASTER_EXTRACT_VERSION} · {report.summary.reconciled}/{report.summary.planningGroups}{" "}
          reconciled
          {report.refusedCount > 0 ? ` · ${report.refusedCount} refused` : ""}
        </p>
      </header>

      {!report.published ? (
        <div className="technical-border p-4 border-error">
          <p className="font-label-caps text-label-caps text-error">PUBLISH BLOCKED — RECONCILE FAILURES</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Rows with source disagreement cannot be published until the Portfolio extract is corrected.
          </p>
        </div>
      ) : null}

      <section className="technical-border p-4 overflow-x-auto">
        <table className="w-full font-data-mono text-data-mono text-sm min-w-[720px]">
          <thead>
            <tr className="text-left border-b border-primary">
              <th className="py-2 pr-4">PLANNING GROUP</th>
              <th className="py-2 pr-4">STATUS</th>
              <th className="py-2 pr-4">OPEN</th>
              <th className="py-2 pr-4">FUNDED</th>
              <th className="py-2 pr-4">TEAMS</th>
              <th className="py-2 pr-4">NPV</th>
              <th className="py-2">FP</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.planningGroup} className="border-b border-outline-variant align-top">
                <td className="py-2 pr-4">{row.planningGroup}</td>
                <td className={`py-2 pr-4 ${row.ok ? "text-secondary" : "text-error"}`}>
                  {row.ok ? "RECONCILED" : "REFUSED"}
                </td>
                <td className="py-2 pr-4">{cell(row, "openItems")}</td>
                <td className="py-2 pr-4">{cell(row, "fundedItems")}</td>
                <td className="py-2 pr-4">{cell(row, "teamSlots")}</td>
                <td className="py-2 pr-4">{cell(row, "fundedNpv", true)}</td>
                <td className="py-2 text-on-surface-variant text-xs">
                  {row.cells.fundedItems?.fingerprint?.slice(0, 8) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {report.rows.some((r) => r.refused.length) ? (
        <section className="technical-border p-4 space-y-3">
          <h2 className="font-label-caps text-label-caps text-primary">REFUSAL DETAIL</h2>
          {report.rows
            .filter((r) => r.refused.length)
            .map((r) => (
              <div key={r.planningGroup} className="font-data-mono text-data-mono text-sm">
                <div className="text-error">{r.planningGroup}</div>
                {r.refused.map((ref, i) => (
                  <div key={i} className="text-on-surface-variant ml-2">
                    {ref.field}: {ref.reason}
                  </div>
                ))}
              </div>
            ))}
        </section>
      ) : null}
    </main>
  );
}

function cell(row, field, money = false) {
  const c = row.cells[field];
  if (!c) return "—";
  const v = c.value;
  if (money) return `$${(v / 1e6).toFixed(2)}M`;
  return v;
}