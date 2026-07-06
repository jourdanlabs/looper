// Deterministic metric compute from engine result — no guessing.

import { METRIC_DEFINITIONS, METRIC_SETS } from "./definitions.mjs";
import { vellumWrap } from "../strata/vellum.mjs";
import { FUNDING, PRODUCT_LIST, PLANNING_GROUP_LIST } from "../types.mjs";

/**
 * Compute all governed metrics from a prioritize() result.
 */
export function computeMetrics(engineResult) {
  const ranked = engineResult.ranked ?? [];
  const funded = ranked.filter((r) => r._funding === FUNDING.FUNDED);
  const values = {};

  // Delivery by Planning Group
  for (const pg of PLANNING_GROUP_LIST) {
    const items = ranked.filter((r) => r.planningGroup === pg);
    const fundedPg = funded.filter((r) => r.planningGroup === pg);
    values[`delivery.funded-count:${pg}`] = fundedPg.length;
    values[`delivery.funded-npv:${pg}`] = round2(
      fundedPg.reduce((a, r) => a + (r._breakdown?.npv?.total ?? 0), 0)
    );
    values[`delivery.open-backlog:${pg}`] = items.length;
  }

  // Delivery by Product
  for (const product of PRODUCT_LIST) {
    const items = ranked.filter((r) => r.product === product);
    const fundedProd = funded.filter((r) => r.product === product);
    values[`delivery.product-funded:${product}`] = fundedProd.length;
    values[`delivery.product-npv:${product}`] = round2(
      fundedProd.reduce((a, r) => a + (r._breakdown?.npv?.total ?? 0), 0)
    );
  }

  // Flow — portfolio flow metrics (deterministic formulas)
  const total = ranked.length || 1;
  const held = ranked.filter((r) => r._funding === FUNDING.HELD_DUPLICATE).length;
  const highConf = ranked.filter(
    (r) => (r.deliveryConfidence ?? 0) * (r.valueConfidence ?? 0) >= 0.64
  ).length;

  values["flow.throughput"] = funded.length;
  values["flow.flow-efficiency"] = Math.round((funded.length / total) * 100);
  values["flow.predictability"] = round2(highConf / total);
  values["flow.duplicate-hold-rate"] = Math.round((held / total) * 100);

  const metrics = METRIC_DEFINITIONS.map((def) => {
    const entries = metricEntries(def, values);
    return {
      ...def,
      entries: entries.map((e) => ({
        ...e,
        envelope: vellumWrap(e.value, {
          source: `engine/prioritize`,
          extractVersion: engineResult.methodology_version,
        }),
      })),
    };
  });

  return {
    methodology_version: engineResult.methodology_version,
    head: engineResult.head,
    sets: {
      [METRIC_SETS.DELIVERY]: metrics.filter((m) => m.set === METRIC_SETS.DELIVERY),
      [METRIC_SETS.FLOW]: metrics.filter((m) => m.set === METRIC_SETS.FLOW),
    },
    metrics,
  };
}

function metricEntries(def, values) {
  if (def.cut === "planningGroup") {
    return PLANNING_GROUP_LIST.map((pg) => ({
      cut: pg,
      value: values[`${def.id}:${pg}`] ?? 0,
    }));
  }
  if (def.cut === "product") {
    return PRODUCT_LIST.map((p) => ({
      cut: p,
      value: values[`${def.id}:${p}`] ?? 0,
    }));
  }
  return [{ cut: "all", value: values[def.id] ?? 0 }];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}