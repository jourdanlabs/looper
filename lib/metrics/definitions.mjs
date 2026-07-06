// Governed metric definitions — Delivery + Flow sets, SHA-fingerprinted.

import { sha } from "../ledger.mjs";

export const METRIC_SETS = Object.freeze({
  DELIVERY: "delivery",
  FLOW: "flow",
});

const RAW_DEFINITIONS = [
  // Delivery — by Planning Group
  { id: "delivery.funded-count", set: METRIC_SETS.DELIVERY, label: "Funded Items", unit: "count", cut: "planningGroup" },
  { id: "delivery.funded-npv", set: METRIC_SETS.DELIVERY, label: "Funded NPV", unit: "usd", cut: "planningGroup" },
  { id: "delivery.open-backlog", set: METRIC_SETS.DELIVERY, label: "Open Backlog", unit: "count", cut: "planningGroup" },
  // Delivery — by Product
  { id: "delivery.product-funded", set: METRIC_SETS.DELIVERY, label: "Funded by Product", unit: "count", cut: "product" },
  { id: "delivery.product-npv", set: METRIC_SETS.DELIVERY, label: "NPV by Product", unit: "usd", cut: "product" },
  // Flow
  { id: "flow.throughput", set: METRIC_SETS.FLOW, label: "Throughput (funded/quarter)", unit: "count", cut: "all" },
  { id: "flow.flow-efficiency", set: METRIC_SETS.FLOW, label: "Flow Efficiency", unit: "pct", cut: "all" },
  { id: "flow.predictability", set: METRIC_SETS.FLOW, label: "Predictability Index", unit: "score", cut: "all" },
  { id: "flow.duplicate-hold-rate", set: METRIC_SETS.FLOW, label: "Duplicate Hold Rate", unit: "pct", cut: "all" },
];

export const METRIC_DEFINITIONS = Object.freeze(
  RAW_DEFINITIONS.map((d) => ({
    ...d,
    version: "v1.0",
    fingerprint: sha(JSON.stringify(d)).slice(0, 16),
  }))
);

export function definitionById(id) {
  return METRIC_DEFINITIONS.find((d) => d.id === id) ?? null;
}