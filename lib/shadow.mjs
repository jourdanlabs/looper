// HL Prioritization OS — SHADOW TEST harness.
//
// Leland's launch role: run the same sample list through this deterministic
// scorer AND the live LLM model, and report the variance. This module produces
// that report, plus the thing the LLM cannot: a REPRODUCIBILITY PROOF.
//
// Two outputs:
//   1. Reproducibility — each request is scored `runs` times; every run must
//      yield a byte-identical receipt. If they don't, THIS tool has a bug and we
//      say so. (They won't — it's a pure function.) The point of showing it:
//      re-run the LLM on the same request and its score can move. Ours can't.
//   2. Variance vs. the LLM — per request, |ours − theirs|, bucketed AGREE /
//      MINOR / MAJOR, with the top factors that drove ours, so a divergence is
//      explainable ("we scored it lower because Strategic alignment was 1/3"),
//      not a mystery. That explainability is the improvement note the process
//      asks Leland to document.
//
// This is zero-interference: it reads a sample list and (optionally) a file of
// the LLM's scores. It never touches the launch system.

import { scoreRequest } from "./base-score.mjs";

const AGREE = 5; // |delta| ≤ this → AGREE
const MINOR = 15; // ≤ this → MINOR divergence; above → MAJOR

/**
 * @param {Array} samples  [{ id, title?, answers, businessCase? }, ...]
 *   `answers` is the intake-answer object base-score consumes. Back-compat: if a
 *   sample has no `answers`, the sample object itself is used as the answers.
 * @param {object} [opts]
 * @param {Record<string,number>} [opts.llmScores]  id → the LLM's score (0..100)
 * @param {number} [opts.runs=3]  reproducibility re-runs per item
 * @param {object} [opts.scoreOpts]  passed to scoreRequest (e.g. rubric override)
 * @returns {object} the full report
 */
export function runShadow(samples, opts = {}) {
  const runs = Math.max(2, Number(opts.runs) || 3);
  const llm = opts.llmScores || {};
  const rows = [];
  let reproducible = true;

  for (const s of samples) {
    const answers = s.answers ?? s;
    const scoreOpts = { ...(opts.scoreOpts || {}) };
    if (s.businessCase) scoreOpts.businessCase = s.businessCase;

    // Reproducibility: score it `runs` times, compare receipts.
    const receipts = new Set();
    let last = null;
    for (let i = 0; i < runs; i++) {
      last = scoreRequest(answers, scoreOpts);
      receipts.add(last.receipt_sha256);
    }
    const stable = receipts.size === 1;
    if (!stable) reproducible = false;

    const mine = num(last.adjustedScore ?? last.baseScore);
    const theirs = s.id != null && llm[s.id] != null ? num(llm[s.id]) : null;
    const delta = theirs == null ? null : mine - theirs;
    const bucket = delta == null ? "N/A" : Math.abs(delta) <= AGREE ? "AGREE" : Math.abs(delta) <= MINOR ? "MINOR" : "MAJOR";

    const topFactors = (last.factors || [])
      .slice()
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map((f) => `${f.label} ${Math.round(f.signal * 3)}/3`);

    rows.push({
      id: s.id ?? null,
      title: s.title ?? null,
      myScore: mine,
      llmScore: theirs,
      delta,
      bucket,
      reproducible: stable,
      receipt: last.receipt_sha256.slice(0, 12),
      businessCaseApplied: Boolean(last.businessCaseApplied),
      unanswered: last.unanswered || [],
      topDrivers: topFactors,
    });
  }

  const scored = rows.filter((r) => r.delta != null);
  const summary = {
    items: rows.length,
    reproducible, // true = every item byte-identical across runs
    runsPerItem: runs,
    compared: scored.length,
    agree: scored.filter((r) => r.bucket === "AGREE").length,
    minor: scored.filter((r) => r.bucket === "MINOR").length,
    major: scored.filter((r) => r.bucket === "MAJOR").length,
    meanAbsDelta: scored.length ? round2(scored.reduce((s, r) => s + Math.abs(r.delta), 0) / scored.length) : null,
    maxAbsDelta: scored.length ? Math.max(...scored.map((r) => Math.abs(r.delta))) : null,
  };
  return { summary, rows };
}

/** Human-readable variance report (markdown). */
export function renderShadowReport(report) {
  const { summary: s, rows } = report;
  const L = [];
  L.push(`# Shadow-test variance report`);
  L.push("");
  L.push(`- **Reproducibility:** ${s.reproducible ? `✅ all ${s.items} requests byte-identical across ${s.runsPerItem} runs each` : `⚠️ NON-reproducible items present — investigate`}`);
  if (s.compared) {
    L.push(`- **Variance vs. LLM (${s.compared} compared):** ${s.agree} agree · ${s.minor} minor · ${s.major} major`);
    L.push(`- **Mean |Δ|:** ${s.meanAbsDelta} · **Max |Δ|:** ${s.maxAbsDelta}`);
  } else {
    L.push(`- **Variance vs. LLM:** no LLM scores supplied — reproducibility-only run.`);
  }
  L.push("");
  L.push(`| ID | Ours | LLM | Δ | Flag | Repro | Top drivers |`);
  L.push(`|---|--:|--:|--:|---|:-:|---|`);
  for (const r of rows) {
    L.push(
      `| ${r.id ?? "—"} | ${r.myScore} | ${r.llmScore ?? "—"} | ${r.delta == null ? "—" : (r.delta > 0 ? "+" : "") + r.delta} | ${flag(r.bucket)} | ${r.reproducible ? "✅" : "⚠️"} | ${r.topDrivers.join(", ")} |`,
    );
  }
  L.push("");
  L.push(`_Ours is a pure function of published weights — the receipt is identical every run. Where the LLM diverges, the "Top drivers" column is the documented, defensible reason ours landed where it did._`);
  return L.join("\n");
}

function flag(b) {
  return b === "MAJOR" ? "🔴 major" : b === "MINOR" ? "🟡 minor" : b === "AGREE" ? "🟢 agree" : "—";
}
function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}
