import assert from "node:assert/strict";
import test from "node:test";

import { prioritize } from "../lib/engine.mjs";
import { buildStrataReport, publishStrataReport } from "../lib/strata/report.mjs";
import { reconcileField } from "../lib/strata/reconcile.mjs";
import { computeMetrics } from "../lib/metrics/compute.mjs";
import { publishMetrics } from "../lib/metrics/publish.mjs";
import { METRIC_DEFINITIONS } from "../lib/metrics/definitions.mjs";
import { listDocs, getDoc } from "../lib/docs/registry.mjs";
import { ask } from "../lib/assistant/ask.mjs";
import { submitRequest, approveRequest, ppoReset } from "../lib/ppo/store.mjs";
import { getPatContext, listPatContext } from "../lib/pat/store.mjs";
import { Ledger } from "../lib/ledger.mjs";
import { INITIATIVES } from "../seed/initiatives.mjs";

const OPTS = { capacity: 12 };

test("STRATA reconcile refuses jira/align mismatch", () => {
  const r = reconcileField("openItems", {
    jira: { openItems: 9 },
    align: { openItems: 10 },
  });
  assert.equal(r.ok, false);
  assert.equal(r.refused, true);
});

test("STRATA report flags refused Planning Groups", () => {
  const engine = prioritize(INITIATIVES, OPTS);
  const report = buildStrataReport(engine);
  assert.ok(report.refusedCount >= 1);
  assert.equal(report.published, false);
});

test("STRATA publish blocked when reconcile fails", () => {
  const engine = prioritize(INITIATIVES, OPTS);
  const ledger = new Ledger();
  const pub = publishStrataReport(engine, ledger);
  assert.equal(pub.ok, false);
  assert.equal(pub.refused, true);
});

test("metrics — definitions are fingerprinted", () => {
  assert.ok(METRIC_DEFINITIONS.length >= 8);
  for (const d of METRIC_DEFINITIONS) {
    assert.ok(d.fingerprint, d.id);
  }
});

test("metrics — compute is deterministic", () => {
  const e = prioritize(INITIATIVES, OPTS);
  const m1 = computeMetrics(e);
  const m2 = computeMetrics(e);
  assert.equal(
    JSON.stringify(m1.metrics.map((m) => m.entries)),
    JSON.stringify(m2.metrics.map((m) => m.entries))
  );
});

test("metrics publish writes METRIC_PUBLISHED", () => {
  const e = prioritize(INITIATIVES, OPTS);
  const ledger = new Ledger();
  const pub = publishMetrics(e, ledger);
  assert.equal(pub.ok, true);
  assert.ok(ledger.events.some((ev) => ev.kind === "METRIC_PUBLISHED"));
});

test("docs registry has operating + governance", () => {
  const ops = listDocs({ kind: "operating" });
  const gov = listDocs({ kind: "governance" });
  assert.ok(ops.length >= 3);
  assert.ok(gov.length >= 2);
  assert.ok(getDoc("gov.dials"));
});

test("PPO local store — submit and approve", () => {
  ppoReset();
  const ledger = new Ledger();
  const req = submitRequest(
    { type: "add-team", summary: "Add Platform Squad", requester: "alex" },
    { ledger }
  );
  assert.equal(req.status, "Awaiting Approval");
  const approved = approveRequest(req.id, { approver: "committee", ledger });
  assert.equal(approved.status, "Approved");
  assert.ok(ledger.events.some((e) => e.kind === "PPO_APPROVED"));
});

test("Product context is listable", () => {
  const all = listPatContext();
  assert.ok(all.length >= 3);
  const ctx = getPatContext("checkout");
  assert.ok(ctx.fingerprint);
});

test("assistant cites rank", () => {
  const engine = prioritize(INITIATIVES, OPTS);
  const a = ask("rank of INIT-001", { engineResult: engine });
  assert.equal(a.ok, true);
  assert.match(a.answer, /INIT-001/);
  assert.ok(a.citations.length);
});

test("assistant refuses unknown question", () => {
  const engine = prioritize(INITIATIVES, OPTS);
  const a = ask("what is the meaning of life", { engineResult: engine });
  assert.equal(a.ok, false);
  assert.equal(a.refused, true);
});

test("assistant answers capacity", () => {
  const engine = prioritize(INITIATIVES, OPTS);
  const a = ask("capacity utilization", { engineResult: engine });
  assert.equal(a.ok, true);
  assert.match(a.answer, /team-slots/);
});