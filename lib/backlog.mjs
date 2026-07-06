// LOOPER — backlog views: All / Planning Group / Team.

import { groupByPlanningGroup, groupByTeam } from "./hierarchy.mjs";
import { PLANNING_GROUP_LIST, TEAM_LIST } from "./types.mjs";

/**
 * Build the three standard backlog views from a ranked set.
 * Views are pure projections — regenerated from engine output, never cached.
 */
export function buildBacklogViews(ranked) {
  const all = ranked.map(rowView);

  const byPlanningGroup = {};
  for (const pg of PLANNING_GROUP_LIST) byPlanningGroup[pg] = [];
  for (const [pg, items] of Object.entries(groupByPlanningGroup(ranked))) {
    byPlanningGroup[pg] = items.map(rowView);
  }

  const byTeam = {};
  for (const t of TEAM_LIST) byTeam[t] = [];
  for (const [team, items] of Object.entries(groupByTeam(ranked))) {
    byTeam[team] = items.map(rowView);
  }

  return {
    all,
    byPlanningGroup,
    byTeam,
    counts: {
      all: all.length,
      planningGroups: Object.fromEntries(
        PLANNING_GROUP_LIST.map((pg) => [pg, byPlanningGroup[pg]?.length ?? 0])
      ),
      teams: Object.fromEntries(TEAM_LIST.map((t) => [t, byTeam[t]?.length ?? 0])),
    },
  };
}

function rowView(it) {
  return {
    id: it.id,
    title: it.title,
    rank: it._rank,
    score: it._score,
    tier: it._tier,
    funding: it._funding,
    level: it.level,
    planningGroup: it.planningGroup,
    team: it.team,
    product: it.product,
    parentId: it.parentId,
    scoreReceipt: it._scoreReceipt,
    area: it.area,
    valueType: it.valueType,
  };
}