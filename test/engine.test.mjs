// LOOPER — engine tests. Zero-dep, node:test. `node --test`.
// These prove the things the BUILD_SPEC calls non-negotiable (§10):
//   (a) determinism            — two prioritize() runs → byte-identical ranking
//   (b) ledger tamper-evidence — mutate a recorded score → verify().ok === false
//   (c) dedup holds the cluster— 2 of 3 calculators held
//   (d) time-value             — early-effective save ranks ABOVE late-effective
// …plus mandate carve-out, NPV time-value math, rubric gate, methodology
// sandbox/publish, and tiering.

import { test } from "node:test";
import assert from "node:assert/strict";

import { prioritize } from "../lib/engine.mjs";
import { scoreInitiative } from "../lib/score.mjs";
import { npvImpact, activeFraction } from "../lib/npv.mjs";
import { findDuplicates } from "../lib/dedup.mjs";
import { validate as validateEvidence, canSubmit } from "../lib/rubric.mjs";
import { preview, publish, bumpVersion } from "../lib/methodology.mjs";
import { renderBrief } from "../lib/brief.mjs";
import { INITIATIVES } from "../seed/initiatives.mjs";
import { FUNDING, DEDUP, TIERS, VALUE_TYPES, STATES } from "../lib/types.mjs";

const OPTS = { capacity: 12 };

// ─── (a) DETERMINISM ─────────────────────────────────────────────────────────
test("(a) determinism — two runs give byte-identical ranking", () => {
  const r1 = prioritize(INITIATIVES, OPTS);
  const r2 = prioritize(INITIATIVES, OPTS);
  const shape = (r) =>
    JSON.stringify(
      r.ranked.map((x) => [x.id, x._score, x._priorityRaw, x._rank, x._tier, x._funding])
    );
  assert.equal(shape(r1), shape(r2), "ranking must be byte-identical across runs");
  // single-item score is pure too
  assert.equal(scoreInitiative(INITIATIVES[0]).score, scoreInitiative(INITIATIVES[0]).score);
  assert.deepEqual(
    scoreInitiative(INITIATIVES[0]).breakdown.npv,
    scoreInitiative(INITIATIVES[0]).breakdown.npv
  );
});

// ─── (b) LEDGER TAMPER-EVIDENCE ──────────────────────────────────────────────
test("(b) the decision chain verifies, and tampering breaks it", () => {
  const r = prioritize(INITIATIVES, OPTS);
  assert.equal(r.verify.ok, true);
  assert.ok(r.verify.count > 0);

  const scored = r.ledger.events.find((e) => e.kind === "SCORED");
  assert.ok(scored, "a SCORED event must exist");
  scored.payload.score = 999; // mutate a recorded decision
  assert.equal(r.ledger.verify().ok, false, "tampering must flip verify().ok to false");
});

// ─── (c) DEDUP HOLDS THE DUPLICATE CLUSTER (2 of 3) ──────────────────────────
test("(c) the three-calculator problem is caught — 2 of 3 held", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const calc = r.clusters.find((c) => c.outcome === "pricing calculator");
  assert.ok(calc, "pricing calculator cluster must exist");
  assert.equal(calc.members.length, 3, "all three calculators clustered");
  assert.equal(calc.duplicates.length, 2, "two held, one funded");

  const held = r.ranked.filter(
    (x) => calc.duplicates.includes(x.id)
  );
  assert.equal(held.length, 2);
  for (const h of held) assert.equal(h._funding, FUNDING.HELD_DUPLICATE);
});

test("held duplicates never consume capacity", () => {
  const r = prioritize(INITIATIVES, OPTS);
  for (const h of r.held) assert.equal(h._funding, FUNDING.HELD_DUPLICATE);
  const fundedTeams = r.funded.reduce((a, x) => a + x._teams, 0);
  assert.equal(r.capacityUsed, fundedTeams);
  assert.ok(r.capacityUsed <= r.capacity);
});

// ─── (d) TIME-VALUE — early-effective save ranks above late-effective ────────
test("(d) time-value — an early cost-save ranks ABOVE an otherwise-identical late one", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const early = r.ranked.find((x) => x.id === "INIT-006"); // effective month 2
  const late = r.ranked.find((x) => x.id === "INIT-007"); // effective month 11
  assert.ok(early && late);
  // both are real, scored items — neither is held as a duplicate
  assert.notEqual(early._funding, FUNDING.HELD_DUPLICATE);
  assert.notEqual(late._funding, FUNDING.HELD_DUPLICATE);
  assert.ok(
    early._breakdown.npv.total > late._breakdown.npv.total,
    "early-effective NPV must exceed late-effective NPV"
  );
  assert.ok(early._rank < late._rank, "early must rank above late");
});

test("activeFraction annuitizes from the effective month", () => {
  const start = new Date("2026-01-01T00:00:00Z");
  // effective Jan (month 0 offset) → full year
  assert.equal(activeFraction("2026-01-01", 1, start), 1);
  // effective Nov (month 10 offset) → 2/12 active in Year 1
  assert.equal(Math.round(activeFraction("2026-11-01", 1, start) * 12), 2);
  // any later year is fully active
  assert.equal(activeFraction("2026-11-01", 2, start), 1);
  // not yet effective in this window → 0
  assert.equal(activeFraction("2027-06-01", 1, start), 0);
});

test("NPV discounts and breaks down by component", () => {
  const npv = npvImpact(
    { revenueImpact: 3_000_000, cogs: 0, ongoingTCO: 0 },
    { r: 0.1, horizon: 3, horizonStart: "2026-01-01" }
  );
  // $1M/yr revenue, discounted 3 yrs at 10%: ~ 1/1.1 + 1/1.21 + 1/1.331 ≈ 2.487M
  assert.ok(npv.total > 2_400_000 && npv.total < 2_500_000, `got ${npv.total}`);
  assert.equal(npv.perYear.length, 3);
  assert.ok(npv.components.revenue > 0);
});

// ─── MANDATE CARVE-OUT ───────────────────────────────────────────────────────
test("mandate auto-pins to the top tier and is funded, score still computed", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const tx = r.ranked.find((x) => x.id === "INIT-003");
  assert.equal(tx.mandate, true);
  assert.equal(tx._tier, TIERS.NOW, "mandate pins to Now");
  assert.equal(tx._funding, FUNDING.FUNDED, "mandate is funded");
  assert.equal(tx._rank, 1, "mandate sorts to the front of the queue");
  assert.ok(tx._score > 0, "score is still computed for transparency");
});

// ─── FOUND MONEY ─────────────────────────────────────────────────────────────
test("found money rises — the insurance portal funds near the top", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const ins = r.ranked.find((x) => x.id === "INIT-001");
  assert.equal(ins._funding, FUNDING.FUNDED);
  assert.ok(ins._rank <= 4, `insurance ranked ${ins._rank}, expected top 4`);
});

// ─── INTAKE REFUSAL ──────────────────────────────────────────────────────────
test("the napkin idea is refused — no structured intake, no ranking", () => {
  const r = prioritize(INITIATIVES, OPTS);
  assert.ok(r.rejected.some((x) => x.id === "INIT-013"));
  assert.ok(!r.ranked.some((x) => x.id === "INIT-013"));
});

// ─── RUBRIC EVIDENCE GATE (Appendix A) ───────────────────────────────────────
test("rubric blocks Draft→Submitted when a claim has no evidence", () => {
  const ok = INITIATIVES.find((i) => i.id === "INIT-001");
  assert.equal(validateEvidence(ok).ok, true);
  assert.equal(canSubmit(ok).allowed, true);

  // strip the revenue source → revenue claim now unsourced → blocked
  const bad = { ...ok, evidence: { ...ok.evidence, revenue: undefined } };
  const v = validateEvidence(bad);
  assert.equal(v.ok, false);
  assert.ok(v.missing.some((m) => m.field === "revenue"));
  const cs = canSubmit(bad);
  assert.equal(cs.allowed, false);
  assert.equal(cs.state, STATES.DRAFT);
});

test("rubric: a cost-save claim requires BOTH a source and an effective date", () => {
  const base = INITIATIVES.find((i) => i.id === "INIT-005");
  assert.equal(validateEvidence(base).ok, true);
  const noDate = { ...base, savingsEffectiveDate: undefined };
  assert.equal(validateEvidence(noDate).ok, false);
});

// ─── TIERING ─────────────────────────────────────────────────────────────────
test("the stale watchlist item stays on the Watchlist tier", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const stale = r.ranked.find((x) => x.id === "INIT-012");
  assert.equal(stale._tier, TIERS.WATCHLIST);
});

test("every item lands in exactly one tier; tiers partition the board", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const total = Object.values(r.tiers).reduce((a, arr) => a + arr.length, 0);
  assert.equal(total, r.ranked.length);
});

// ─── RANKING MONOTONICITY (within the non-mandate band) ──────────────────────
test("ranking is by priority within the discretionary band, not by opinion", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const discretionary = r.ranked.filter((x) => !x.mandate);
  for (let i = 1; i < discretionary.length; i++) {
    assert.ok(
      discretionary[i - 1]._priorityRaw >= discretionary[i]._priorityRaw - 1e-6,
      "discretionary items ranked monotonically by raw priority"
    );
  }
});

// ─── METHODOLOGY — SANDBOX vs PUBLISH ────────────────────────────────────────
test("sandbox preview re-ranks under proposed dials WITHOUT writing a ledger", () => {
  const accepted = INITIATIVES.filter((i) => i.id !== "INIT-013");
  const p = preview(accepted, {
    currentDials: {},
    proposedDials: { valueTypeWeights: { [VALUE_TYPES.REVENUE]: 2.5 } },
    capacity: 12,
  });
  assert.ok(p.current.length && p.proposed.length);
  assert.ok(p.summary.movedCount >= 1, "doubling revenue weight should move at least one item");
  assert.equal(p.ledger, undefined, "sandbox must not produce a ledger");
});

test("publish writes METHODOLOGY_PUBLISHED, bumps version, requires a why", () => {
  const accepted = INITIATIVES.filter((i) => i.id !== "INIT-013");
  // run a real pipeline to get a live ledger to append to
  const r = prioritize(INITIATIVES, OPTS);
  const before = r.ledger.events.length;
  const pub = publish(accepted, {
    ledger: r.ledger,
    currentDials: {},
    proposedDials: { valueTypeWeights: { [VALUE_TYPES.REVENUE]: 2.5 } },
    currentVersion: "v1.0",
    who: "captain",
    why: "revenue quarter",
    opts: { capacity: 12 },
  });
  assert.equal(pub.version, "v1.1");
  assert.ok(r.ledger.events.length === before + 1);
  assert.ok(r.ledger.events.some((e) => e.kind === "METHODOLOGY_PUBLISHED"));
  assert.equal(r.ledger.verify().ok, true, "the chain still verifies after publish");

  assert.throws(() => publish(accepted, { ledger: r.ledger, why: "" }), /why/);
  assert.equal(bumpVersion("v1.0"), "v1.1");
  assert.equal(bumpVersion("v1.9"), "v1.10");
});

// ─── DEDUP THRESHOLD ─────────────────────────────────────────────────────────
test("dedup threshold is tunable", () => {
  const items = INITIATIVES.filter((i) => i.valueType !== undefined);
  const loose = findDuplicates(items, { threshold: 0.5 });
  assert.ok(loose.clusters.some((c) => c.outcome === "pricing calculator"));
  const strict = findDuplicates(items, { threshold: 0.99 });
  assert.ok(!strict.clusters.some((c) => c.outcome === "pricing calculator"));
});

// ─── BRIEF ───────────────────────────────────────────────────────────────────
test("the brief is grounded — cites receipts, carries the chain head", () => {
  const r = prioritize(INITIATIVES, OPTS);
  const md = renderBrief(r);
  assert.match(md, /receipt `/);
  assert.match(md, /tamper-evident/);
  assert.match(md, /methodology v1\.0/);
  for (const f of r.funded) assert.ok(md.includes(f.title), `brief should mention ${f.title}`);
});

// ─── PORTFOLIO ───────────────────────────────────────────────────────────────
test("portfolio surfaces the value-type distribution (the 'where's growth?' lens)", () => {
  const r = prioritize(INITIATIVES, OPTS);
  assert.ok(Array.isArray(r.portfolio.byValueType.all));
  const sumPct = r.portfolio.byValueType.all.reduce((a, x) => a + x.count, 0);
  assert.equal(sumPct, r.ranked.length, "value-type buckets cover every intaken item");
  assert.ok(r.portfolio.fundedNpvTotal > 0);
});
