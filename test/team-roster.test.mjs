import assert from "node:assert/strict";
import test from "node:test";

import { buildEngineerRoster, findEngineersBySkill } from "../lib/team-roster.mjs";
import { TEAM_LIST } from "../lib/types.mjs";

test("engineer roster covers every team", () => {
  const roster = buildEngineerRoster();
  assert.equal(roster.total, 10);
  for (const team of TEAM_LIST) {
    assert.ok(roster.byTeam[team]?.length >= 1, `${team} has no engineers`);
  }
});

test("each engineer has strength and skillset", () => {
  const roster = buildEngineerRoster();
  for (const eng of roster.engineers) {
    assert.ok(eng.strength);
    assert.ok(eng.skillset.length >= 3);
    assert.ok(eng.envelope.fingerprint);
  }
});

test("findEngineersBySkill matches pricing", () => {
  const hits = findEngineersBySkill("pricing");
  assert.ok(hits.length >= 1);
  assert.ok(hits.some((e) => e.strength.toLowerCase().includes("pricing")));
});