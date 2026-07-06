// Engineer roster views — strengths & skillsets grouped for capacity planning.

import { ENGINEERS } from "../seed/engineers.mjs";
import { TEAM_LIST, PLANNING_GROUP_LIST } from "./types.mjs";
import { vellumWrap } from "./strata/vellum.mjs";

/**
 * Build roster showcase grouped by team, with Planning Group cross-cuts.
 */
export function buildEngineerRoster(source = ENGINEERS) {
  const byTeam = {};
  for (const t of TEAM_LIST) byTeam[t] = [];
  for (const eng of source) {
    if (!byTeam[eng.team]) byTeam[eng.team] = [];
    byTeam[eng.team].push(envelopeEngineer(eng));
  }

  const byPlanningGroup = {};
  for (const pg of PLANNING_GROUP_LIST) byPlanningGroup[pg] = [];
  for (const eng of source) {
    if (!byPlanningGroup[eng.planningGroup]) byPlanningGroup[eng.planningGroup] = [];
    byPlanningGroup[eng.planningGroup].push(envelopeEngineer(eng));
  }

  return {
    total: source.length,
    byTeam,
    byPlanningGroup,
    engineers: source.map(envelopeEngineer),
  };
}

/** Find engineers whose strength or skillset matches a query (deterministic). */
export function findEngineersBySkill(query, source = ENGINEERS) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  return source
    .filter(
      (e) =>
        e.strength.toLowerCase().includes(q) ||
        e.skillset.some((s) => s.toLowerCase().includes(q)) ||
        e.team.toLowerCase().includes(q) ||
        e.planningGroup.toLowerCase().includes(q)
    )
    .map(envelopeEngineer);
}

function envelopeEngineer(eng) {
  return {
    ...eng,
    skillset: [...eng.skillset],
    envelope: vellumWrap(eng.strength, { source: "seed/engineers", fields: ["strength", "skillset"] }),
  };
}