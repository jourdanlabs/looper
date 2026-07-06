// Publish governed metrics to the chain.

import { computeMetrics } from "./compute.mjs";
import { LEDGER_KINDS } from "../ledger.mjs";

export function publishMetrics(engineResult, ledger, opts = {}) {
  const computed = computeMetrics(engineResult);

  const receipt = ledger.append(LEDGER_KINDS.METRIC_PUBLISHED, {
    kind: "governed-metrics",
    methodology_version: computed.methodology_version,
    metricCount: computed.metrics.length,
    fingerprints: computed.metrics.map((m) => ({ id: m.id, fingerprint: m.fingerprint })),
    who: opts.who ?? "operator",
    why: opts.why ?? "metric publish",
  });

  return { ok: true, computed, receipt };
}