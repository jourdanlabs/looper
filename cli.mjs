#!/usr/bin/env node
// LOOPER CLI — defensible intake & prioritization, with receipts.
//
//   node cli.mjs prioritize [--capacity N] [--json]
//   node cli.mjs brief        [--capacity N]      # markdown cabinet readout
//   node cli.mjs dedup                            # the third-calculator gate
//   node cli.mjs verify                           # walk the decision chain

import { readFileSync } from "node:fs";
import { prioritize } from "./lib/engine.mjs";
import { renderBrief } from "./lib/brief.mjs";
import { INITIATIVES } from "./seed/initiatives.mjs";
import { scoreRequest } from "./lib/base-score.mjs";
import { triageAll } from "./lib/triage.mjs";
import { runShadow, renderShadowReport } from "./lib/shadow.mjs";
import { SAMPLE_REQUESTS, LLM_SCORES } from "./seed/sample-requests.mjs";

function parse(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x.startsWith("--")) {
      const k = x.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith("--")) a.flags[k] = true;
      else { a.flags[k] = n; i++; }
    } else a._.push(x);
  }
  return a;
}

const { _, flags } = parse(process.argv.slice(2));
const capacity = flags.capacity ? Number(flags.capacity) : 12;
const cmd = _[0] || "prioritize";

const TAG = { FUNDED: "✅ FUNDED", BENCHED: "🪑 BENCHED", HELD_DUPLICATE: "⛔ HELD (dup)" };

if (cmd === "prioritize") {
  const r = prioritize(INITIATIVES, { capacity });
  if (flags.json) { console.log(JSON.stringify(r, (k, v) => (k === "ledger" ? undefined : v), 2)); process.exit(0); }
  console.log(`\n🧭 LOOPER — portfolio prioritization`);
  console.log(`   capacity ${r.capacityUsed}/${r.capacity} teams · ${r.stats.funded} funded · ${r.stats.benched} benched · ${r.stats.held_duplicates} duplicates held · chain ${r.verify.ok ? "✅" : "⚠️"}\n`);
  for (const it of r.ranked) {
    console.log(`  #${String(it._rank).padStart(2)}  ${(TAG[it._funding] || it._funding).padEnd(14)} score ${String(it._score).padStart(3)}  ${it.title}  ·  ${it.area}`);
  }
  if (r.rejected.length) {
    console.log(`\n  Not intaken (unstructured):`);
    for (const x of r.rejected) console.log(`   ⊘ ${x.title} — ${x.errors.length} missing field(s)`);
  }
  console.log(`\n  💰 ${r.stats.duplicatesAvoided} redundant build(s) avoided by the third-calculator gate.\n`);
} else if (cmd === "brief") {
  console.log(renderBrief(prioritize(INITIATIVES, { capacity })));
} else if (cmd === "dedup") {
  const r = prioritize(INITIATIVES, { capacity });
  console.log(`\n🔁 Duplicate outcomes caught (${r.clusters.length} cluster(s)):\n`);
  for (const c of r.clusters) {
    console.log(`  "${c.outcome}" — ${c.members.length} areas: ${c.members.join(", ")}`);
    console.log(`     → fund ${c.primary}, hold ${c.duplicates.join(", ")}\n`);
  }
} else if (cmd === "verify") {
  const r = prioritize(INITIATIVES, { capacity });
  const v = r.verify;
  console.log(v.ok
    ? `✅ Decision chain intact — ${v.count} events, head ${v.head.slice(0, 16)}…`
    : `⚠️ Chain broken at event ${v.brokeAt}: ${v.reason}`);
} else if (cmd === "basescore") {
  // Business-case-independent base score for every sample request.
  const items = loadRequests(flags.file);
  const scored = items.map((s) => ({ ...s, ...scoreRequest(s.answers ?? s, s.businessCase ? { businessCase: s.businessCase } : {}) }));
  if (flags.json) { console.log(JSON.stringify(scored, null, 2)); process.exit(0); }
  console.log(`\n🧮 Base score (independent of business case) — ${scored.length} request(s)\n`);
  for (const it of scored) {
    const bc = it.businessCaseApplied ? `  →  ${it.adjustedScore} w/ business case` : "";
    const flagUn = it.unanswered.length ? `  ⚠ unanswered: ${it.unanswered.join(", ")}` : "";
    console.log(`  ${String(it.id).padEnd(8)} base ${String(it.baseScore).padStart(3)}${bc.padEnd(28)}  ${it.title}${flagUn}`);
  }
  console.log(`\n  Business case modifies the score; it never changes the base framework.\n`);
} else if (cmd === "triage") {
  const items = loadRequests(flags.file).map((s) => ({ ...s, ...scoreRequest(s.answers ?? s, s.businessCase ? { businessCase: s.businessCase } : {}) }));
  const t = triageAll(items);
  if (flags.json) { console.log(JSON.stringify(t, null, 2)); process.exit(0); }
  console.log(`\n🧭 Triage — pillar ownership + suggested do/kill/discover`);
  console.log(`   ${t.counts["Accept"] || 0} accept · ${t.counts["Kill"] || 0} kill · ${t.counts["Requires Discovery"] || 0} discovery  (suggestions — the pillar lead decides)\n`);
  for (const [pillar, rows] of Object.entries(t.byPillar)) {
    console.log(`  ▏${pillar}`);
    for (const r of rows) {
      const tag = r.suggested === "Accept" ? "✅ Accept" : r.suggested === "Kill" ? "⛔ Kill  " : "🔎 Discover";
      console.log(`     ${tag}  score ${String(r.score).padStart(3)}  ${String(r.id).padEnd(8)} ${r.title}`);
      console.log(`                 └ ${r.reason}${r.pmRequired ? "  (PM)" : ""}`);
    }
    console.log("");
  }
} else if (cmd === "shadow") {
  // Shadow test: reproducibility proof + variance vs. the LLM's scores.
  const items = loadRequests(flags.file);
  const llm = flags.llm ? JSON.parse(readFileSync(flags.llm, "utf8")) : (flags.file ? {} : LLM_SCORES);
  const runs = flags.runs ? Number(flags.runs) : 3;
  const report = runShadow(items, { llmScores: llm, runs });
  if (flags.json) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
  console.log("\n" + renderShadowReport(report) + "\n");
} else {
  console.log("commands:");
  console.log("  prioritize | brief | dedup | verify        [--capacity N] [--json]   (portfolio engine)");
  console.log("  basescore                                   [--file req.json] [--json]");
  console.log("  triage                                      [--file req.json] [--json]");
  console.log("  shadow      [--llm llm.json] [--runs N]      [--file req.json] [--json]");
  console.log("\n  --file: a JSON array of requests { id, title, answers, businessCase? }.");
  console.log("          Omit --file to use the built-in SYNTHETIC sample set.\n");
}

// Load requests from a JSON file (launch sample list) or the synthetic sample set.
function loadRequests(file) {
  if (!file) return SAMPLE_REQUESTS;
  const data = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(data) ? data : data.requests || [];
}
