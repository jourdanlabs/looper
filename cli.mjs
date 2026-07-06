#!/usr/bin/env node
// LOOPER CLI — defensible intake & prioritization, with receipts.
//
//   node cli.mjs prioritize [--capacity N] [--json]
//   node cli.mjs brief        [--capacity N]      # markdown cabinet readout
//   node cli.mjs dedup                            # the third-calculator gate
//   node cli.mjs verify                           # walk the decision chain

import { prioritize } from "./lib/engine.mjs";
import { renderBrief } from "./lib/brief.mjs";
import { INITIATIVES } from "./seed/initiatives.mjs";

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
} else {
  console.log("commands: prioritize | brief | dedup | verify   [--capacity N] [--json]");
}
