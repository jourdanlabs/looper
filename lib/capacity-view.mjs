// LOOPER — capacity & utilization by Planning Group.

import { teamsFor } from "./allocate.mjs";
import { groupByPlanningGroup } from "./hierarchy.mjs";
import { FUNDING, PLANNING_GROUP_LIST } from "./types.mjs";

/**
 * Capacity utilization keyed on Planning Group.
 * Every figure traces to the engine's allocation receipts (teams + funding).
 */
export function buildCapacityByPlanningGroup(ranked, { capacity = 12 } = {}) {
  const groups = groupByPlanningGroup(ranked);
  const rows = [];

  for (const pg of PLANNING_GROUP_LIST) {
    const items = groups[pg] ?? [];
    const funded = items.filter((it) => it._funding === FUNDING.FUNDED);
    const benched = items.filter((it) => it._funding === FUNDING.BENCHED);
    const teamsUsed = funded.reduce((a, it) => a + (it._teams ?? teamsFor(it)), 0);
    const teamsRequested = items.reduce((a, it) => a + (it._teams ?? teamsFor(it)), 0);

    rows.push({
      planningGroup: pg,
      items: items.length,
      funded: funded.length,
      benched: benched.length,
      teamsUsed,
      teamsRequested,
      utilizationPct: capacity > 0 ? Math.round((teamsUsed / capacity) * 100) : 0,
      fundedNpv: round2(
        funded.reduce((a, it) => a + (it._breakdown?.npv?.total ?? 0), 0)
      ),
    });
  }

  const totalTeamsUsed = rows.reduce((a, r) => a + r.teamsUsed, 0);

  return {
    capacity,
    totalTeamsUsed,
    headroom: Math.max(0, capacity - totalTeamsUsed),
    utilizationPct: capacity > 0 ? Math.round((totalTeamsUsed / capacity) * 100) : 0,
    byPlanningGroup: rows,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}