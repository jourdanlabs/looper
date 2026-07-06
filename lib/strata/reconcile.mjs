// STRATA reconcile — cross-source agreement or refuse. Never guess.

const TOLERANCE = Object.freeze({
  openItems: 0,
  fundedItems: 0,
  teamSlots: 0,
  fundedNpv: 50_000,
  budgetAllocated: 50_000,
});

/**
 * Reconcile a metric across JIRA / Align / Finance slices.
 * @returns {{ ok: true, value, sources } | { ok: false, refused: true, reason, sources }}
 */
export function reconcileField(field, sources) {
  const jira = sources.jira?.[field];
  const align = sources.align?.[field];
  const finance = sources.finance?.[field];

  const present = [
    jira !== undefined ? { system: "jira", value: jira } : null,
    align !== undefined ? { system: "align", value: align } : null,
    finance !== undefined ? { system: "finance", value: finance } : null,
  ].filter(Boolean);

  if (present.length === 0) {
    return { ok: false, refused: true, reason: `no source for ${field}`, sources };
  }

  // Operational counts: jira + align must agree when both present
  if (field === "openItems" || field === "fundedItems" || field === "teamSlots") {
    if (jira !== undefined && align !== undefined && jira !== align) {
      return {
        ok: false,
        refused: true,
        reason: `jira (${jira}) ≠ align (${align}) for ${field}`,
        sources: { jira, align },
      };
    }
    const value = jira ?? align;
    return { ok: true, value, sources: { jira, align } };
  }

  // Finance fields stand alone but budget vs npv checked at report level
  if (finance !== undefined) {
    return { ok: true, value: finance, sources: { finance } };
  }

  return { ok: false, refused: true, reason: `unsupported field ${field}`, sources };
}

/** Reconcile all standard fields for one Planning Group row. */
export function reconcilePlanningGroup(row) {
  const fields = ["openItems", "fundedItems", "teamSlots", "fundedNpv", "budgetAllocated"];
  const metrics = {};
  const refused = [];

  for (const field of fields) {
    const r = reconcileField(field, row.sources);
    if (r.ok) {
      metrics[field] = r;
    } else {
      refused.push({ field, ...r });
    }
  }

  // Finance cross-check: fundedNpv vs budgetAllocated within tolerance
  const npv = metrics.fundedNpv?.value;
  const budget = metrics.budgetAllocated?.value;
  if (npv !== undefined && budget !== undefined) {
    const delta = Math.abs(npv - budget);
    if (delta > TOLERANCE.fundedNpv) {
      refused.push({
        field: "fundedNpv_vs_budget",
        refused: true,
        reason: `finance npv (${npv}) vs budget (${budget}) delta ${delta} exceeds tolerance`,
        sources: { fundedNpv: npv, budgetAllocated: budget },
      });
    }
  }

  return {
    planningGroup: row.planningGroup,
    ok: refused.length === 0,
    metrics,
    refused,
  };
}