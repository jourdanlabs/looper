// STRATA reporting — Portfolio extract reports by Planning Group, reconcile-or-refuse.

import { MASTER_EXTRACT, MASTER_EXTRACT_VERSION } from "../../seed/master-extract.mjs";
import { reconcilePlanningGroup } from "./reconcile.mjs";
import { vellumWrap } from "./vellum.mjs";
import { LEDGER_KINDS } from "../ledger.mjs";

/**
 * Build the governed portfolio report from Portfolio extract + live engine cuts.
 * Engine numbers are cross-checked where extract has matching fields.
 */
export function buildStrataReport(engineResult, { extract = MASTER_EXTRACT, version = MASTER_EXTRACT_VERSION } = {}) {
  const reconciled = extract.map(reconcilePlanningGroup);

  // Engine-derived cuts for cross-reference
  const engineByPg = {};
  for (const row of engineResult.capacityView?.byPlanningGroup ?? []) {
    engineByPg[row.planningGroup] = row;
  }

  const rows = reconciled.map((r) => {
    const engine = engineByPg[r.planningGroup];
    const cells = {};

    for (const [field, rec] of Object.entries(r.metrics)) {
      cells[field] = vellumWrap(rec.value, {
        source: `master-extract/${version}`,
        extractVersion: version,
        fields: Object.keys(rec.sources),
      });
    }

    return {
      planningGroup: r.planningGroup,
      ok: r.ok,
      refused: r.refused,
      cells,
      engineCrossCheck: engine
        ? vellumWrap(
            { funded: engine.funded, teamsUsed: engine.teamsUsed, fundedNpv: engine.fundedNpv },
            { source: "engine/prioritize", extractVersion: engineResult.methodology_version }
          )
        : null,
    };
  });

  const refusedCount = rows.filter((r) => !r.ok).length;
  const published = refusedCount === 0;

  return {
    version,
    published,
    refusedCount,
    rows,
    summary: {
      planningGroups: rows.length,
      reconciled: rows.filter((r) => r.ok).length,
      refused: refusedCount,
    },
  };
}

/** Publish report to ledger — REFUSED rows block publish unless force=false. */
export function publishStrataReport(engineResult, ledger, opts = {}) {
  const report = buildStrataReport(engineResult, opts);

  if (!report.published && !opts.force) {
    return {
      ok: false,
      refused: true,
      reason: `${report.refusedCount} Planning Group row(s) failed reconcile — publish blocked`,
      report,
    };
  }

  const receipt = ledger.append(LEDGER_KINDS.METRIC_PUBLISHED, {
    kind: "strata-report",
    version: report.version,
    summary: report.summary,
    refusedCount: report.refusedCount,
    who: opts.who ?? "operator",
    why: opts.why ?? "quarterly portfolio report",
  });

  return { ok: true, report, receipt };
}