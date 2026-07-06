import assert from "node:assert/strict";
import test from "node:test";

import { prioritize } from "../lib/engine.mjs";
import { rescoreAll, proposeRanking } from "../lib/ranking.mjs";
import { normalizeBatch, openBacklog } from "../lib/hierarchy.mjs";
import { buildBacklogViews } from "../lib/backlog.mjs";
import { buildCapacityByPlanningGroup } from "../lib/capacity-view.mjs";
import { LEDGER_KINDS } from "../lib/ledger.mjs";
import { stubReset, stubCreateIssue } from "../lib/jira/stub.mjs";
import { submitToIntake } from "../lib/jira/intake-backend.mjs";
import { submitPPORequest } from "../lib/jira/ppo-backend.mjs";
import { INITIATIVES } from "../seed/initiatives.mjs";
import { LEVELS, PLANNING_GROUPS } from "../lib/types.mjs";
import { Ledger } from "../lib/ledger.mjs";

const OPTS = { capacity: 12 };

test("taxonomy defaults — every seed item carries planningGroup", () => {
  for (const it of INITIATIVES) {
    assert.ok(it.planningGroup, `${it.id} missing planningGroup`);
    assert.ok(it.team, `${it.id} missing team`);
    assert.ok(it.product, `${it.id} missing product`);
    assert.ok(it.level, `${it.id} missing level`);
  }
});

test("hierarchy — epic and story children exist under INIT-001", () => {
  const epic = INITIATIVES.find((i) => i.id === "INIT-001-EPIC");
  const story = INITIATIVES.find((i) => i.id === "INIT-001-STORY");
  assert.equal(epic.level, LEVELS.EPIC);
  assert.equal(epic.parentId, "INIT-001");
  assert.equal(story.level, LEVELS.USER_STORY);
  assert.equal(story.parentId, "INIT-001-EPIC");
  assert.equal(epic.planningGroup, PLANNING_GROUPS.GROWTH);
});

test("three-level items score and rank in one stack", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const levels = new Set(r.ranked.map((x) => x.level));
  assert.ok(levels.has(LEVELS.INITIATIVE));
  assert.ok(levels.has(LEVELS.EPIC));
  assert.ok(levels.has(LEVELS.USER_STORY));
});

test("rescoreAll is deterministic and writes RANKING_PUBLISHED", () => {
  const r1 = rescoreAll(INITIATIVES, { ...OPTS, who: "test", why: "unit" });
  const r2 = rescoreAll(INITIATIVES, { ...OPTS, who: "test", why: "unit" });
  const shape = (r) => JSON.stringify(r.ranking.map((x) => [x.id, x.rank, x.score]));
  assert.equal(shape(r1), shape(r2));
  assert.ok(r1.rankingReceipt);
  assert.ok(r1.ledger.events.some((e) => e.kind === LEDGER_KINDS.RANKING_PUBLISHED));
  assert.equal(r1.verify.ok, true);
});

test("proposeRanking does not publish to chain", () => {
  const p = proposeRanking(INITIATIVES, OPTS);
  assert.ok(p.ranked.length);
  assert.ok(!p.ledger.events.some((e) => e.kind === LEDGER_KINDS.RANKING_PUBLISHED));
});

test("backlog views partition by planning group and team", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const views = buildBacklogViews(r.ranked);
  assert.equal(views.all.length, r.ranked.length);
  const pgSum = Object.values(views.counts.planningGroups).reduce((a, n) => a + n, 0);
  assert.equal(pgSum, r.ranked.length);
});

test("capacity view by planning group sums to engine allocation", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const cv = buildCapacityByPlanningGroup(r.ranked, { capacity: 12 });
  assert.equal(cv.totalTeamsUsed, r.capacityUsed);
  assert.ok(cv.byPlanningGroup.length >= 5);
});

test("openBacklog excludes archived and napkin", () => {
  const open = openBacklog(INITIATIVES);
  assert.ok(!open.some((i) => i.id === "INIT-013"));
});

test("Jira stub — INTAKE intake creates issue + chain receipt", async () => {
  stubReset();
  const ledger = new Ledger();
  const result = await submitToIntake(
    {
      id: "STUB-1",
      title: "Stub intake item",
      area: "Growth",
      sponsor: "Test",
      outcome: "stub demo",
      valueType: "Direct Customer Revenue",
      planningGroup: PLANNING_GROUPS.GROWTH,
    },
    { ledger }
  );
  assert.equal(result.mode, "stub");
  assert.ok(result.issue.key.startsWith("INTAKE-"));
  assert.ok(ledger.events.some((e) => e.kind === LEDGER_KINDS.INTAKEN));
  assert.ok(ledger.events.some((e) => e.kind === LEDGER_KINDS.BACKLOG_AUTOMATION));
});

test("Jira stub — GOV request creates issue + PPO_REQUESTED", async () => {
  stubReset();
  const ledger = new Ledger();
  const result = await submitPPORequest(
    { type: "add-team", summary: "Add Platform Squad", requester: "alex" },
    { ledger }
  );
  assert.equal(result.mode, "stub");
  assert.ok(result.issue.key.startsWith("GOV-"));
  assert.ok(ledger.events.some((e) => e.kind === LEDGER_KINDS.PPO_REQUESTED));
});

test("ledger verify still holds after RANKING_PUBLISHED", () => {
  const r = rescoreAll(INITIATIVES, OPTS);
  const event = r.ledger.events.find((e) => e.kind === LEDGER_KINDS.RANKING_PUBLISHED);
  assert.ok(event);
  event.payload.count = 0;
  assert.equal(r.ledger.verify().ok, false);
});