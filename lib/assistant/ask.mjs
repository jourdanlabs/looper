// LOOPER Assistant — cite-or-refuse. Zero bluff. No LLM in the answer path.

import { computeMetrics } from "../metrics/compute.mjs";
import { buildStrataReport } from "../strata/report.mjs";
import { listDocs, getDoc } from "../docs/registry.mjs";
import { listPatContext, getPatContext } from "../pat/store.mjs";
import { docsManifest } from "../docs/registry.mjs";
import { findEngineersBySkill } from "../team-roster.mjs";

/**
 * Answer a question from governed LOOPER sources only.
 * @returns {{ ok: true, answer, citations } | { ok: false, refused: true, reason }}
 */
export function ask(question, context = {}) {
  const q = norm(question);
  if (!q) return refuse("empty question");

  const engine = context.engineResult;
  if (!engine) return refuse("no engine context — cannot ground an answer");

  const metrics = computeMetrics(engine);
  const strata = buildStrataReport(engine);

  // Rank / score lookups
  const rankMatch = q.match(/rank (?:of |for )?([\w-]+)/);
  if (rankMatch) {
    const item = engine.ranked.find((r) => r.id.toLowerCase() === rankMatch[1].toLowerCase());
    if (!item) return refuse(`no ranked item with id ${rankMatch[1]}`);
    return cite(
      `${item.id} ranks #${item._rank} with score ${Math.round(item._score)} in tier ${item._tier} (${item._funding}). Planning Group: ${item.planningGroup}.`,
      [{ source: "engine/ranked", id: item.id, receipt: item._scoreReceipt }]
    );
  }

  // Funded count
  if (/how many funded|funded count|funded items/.test(q)) {
    return cite(
      `${engine.stats.funded} items funded of ${engine.ranked.length} ranked (${engine.capacityUsed}/${engine.capacity} team-slots used).`,
      [{ source: "engine/stats", head: engine.head }]
    );
  }

  // Capacity / utilization
  if (/capacity|utilization|headroom/.test(q)) {
    const cv = engine.capacityView;
    return cite(
      `Capacity: ${cv.totalTeamsUsed}/${cv.capacity} team-slots used (${cv.utilizationPct}% utilization, ${cv.headroom} headroom).`,
      [{ source: "engine/capacityView", head: engine.head }]
    );
  }

  // Planning group capacity
  const pgMatch = q.match(/(?:planning group|pg)\s+(.+?)(?:\s+capacity|\s+utilization|$)/);
  if (pgMatch || /payments|growth|core platform|developer platform|trust/.test(q)) {
    const pgName = pgMatch?.[1]?.trim() || inferPlanningGroup(q);
    const row = engine.capacityView?.byPlanningGroup?.find(
      (r) => r.planningGroup.toLowerCase().includes((pgName ?? "").toLowerCase())
    );
    if (!row) return refuse(`no capacity data for planning group matching "${pgName ?? q}"`);
    return cite(
      `${row.planningGroup}: ${row.funded} funded, ${row.benched} benched, ${row.teamsUsed} team-slots, funded NPV $${(row.fundedNpv / 1e6).toFixed(2)}M.`,
      [{ source: "engine/capacityView", planningGroup: row.planningGroup }]
    );
  }

  // Duplicate holds
  if (/duplicate|calculator|held/.test(q)) {
    return cite(
      `${engine.stats.held_duplicates} items held as duplicates across ${engine.stats.duplicate_clusters} cluster(s).`,
      [{ source: "engine/stats", head: engine.head }]
    );
  }

  // Flow metrics
  if (/throughput|flow|predictability|duplicate hold/.test(q)) {
    const flow = metrics.sets.flow;
    const lines = flow.map((m) => {
      const val = m.entries[0]?.value;
      return `${m.label}: ${val}${m.unit === "pct" ? "%" : ""}`;
    });
    return cite(lines.join("; ") + ".", [{ source: "metrics/flow", head: engine.head }]);
  }

  // Delivery metrics by product
  if (/product|checkout|account hub|platform core|marketplace/.test(q)) {
    const delivery = metrics.sets.delivery.filter((m) => m.cut === "product");
    const lines = delivery.flatMap((m) =>
      m.entries
        .filter((e) => !q.includes("product") || e.cut.toLowerCase().includes(inferProduct(q) ?? ""))
        .map((e) => `${e.cut} ${m.label}: ${e.value}`)
    );
    if (!lines.length) return refuse("no product metric match");
    return cite(lines.slice(0, 4).join("; ") + ".", [{ source: "metrics/delivery", head: engine.head }]);
  }

  // STRATA reconcile status
  if (/strata|reconcile|portfolio extract|report/.test(q)) {
    const ok = strata.summary.reconciled;
    const refused = strata.summary.refused;
    return cite(
      `STRATA report ${strata.version}: ${ok} Planning Groups reconciled, ${refused} refused.`,
      [{ source: "strata/report", version: strata.version }]
    );
  }

  // Documentation
  if (/governance|dial|methodology|operating process|how do (we|i)/.test(q)) {
    const doc = q.includes("dial") || q.includes("governance")
      ? getDoc("gov.dials")
      : q.includes("intake")
        ? getDoc("ops.intake")
        : q.includes("metric") || q.includes("report")
          ? getDoc("gov.metrics")
          : getDoc("ops.prioritize");
    if (!doc) return refuse("no matching documentation");
    return cite(
      `${doc.title} (${doc.version}): ${doc.sections[0]}`,
      [{ source: `docs/${doc.id}`, version: doc.version }]
    );
  }

  if (/documentation|docs manifest/.test(q)) {
    const m = docsManifest();
    return cite(
      `${m.count} documents (${m.operating} operating, ${m.governance} governance) bound to ${m.version}.`,
      [{ source: "docs/manifest" }]
    );
  }

  // Product context
  if (/product context|context module/.test(q)) {
    const id = inferPatId(q);
    if (id) {
      const ctx = getPatContext(id);
      if (!ctx) return refuse(`no Product Context for ${id}`);
      return cite(`${ctx.product} (${ctx.version}): ${ctx.content}`, [
        { source: `pat/${ctx.id}`, fingerprint: ctx.fingerprint },
      ]);
    }
    const all = listPatContext();
    return cite(
      `Product Context modules: ${all.map((f) => f.product).join(", ")}.`,
      all.map((f) => ({ source: `pat/${f.id}`, fingerprint: f.fingerprint }))
    );
  }

  // Engineer strengths / skillset
  if (/engineer|skillset|skill|who (knows|can|handles)|strength|roster/.test(q)) {
    const topic =
      q.match(/(?:pricing|payments|checkout|trust|data|platform|portal|growth)/)?.[0] ||
      q.replace(/.*(?:who|engineer|skill|strength|roster)\s*/i, "").trim();
    const matches = findEngineersBySkill(topic || q);
    if (!matches.length) return refuse(`no engineer roster match for "${topic || q}"`);
    const lines = matches.slice(0, 3).map((e) => `${e.name} (${e.team}): ${e.strength}`);
    return cite(lines.join("; ") + ".", [
      { source: "seed/engineers", count: matches.length },
      ...matches.slice(0, 3).map((e) => ({ source: `engineers/${e.id}`, fingerprint: e.envelope.fingerprint })),
    ]);
  }

  // Chain verify
  if (/chain|verify|ledger|receipt/.test(q)) {
    const v = engine.verify;
    return cite(
      `Chain verify: ${v.ok ? "OK" : "BROKEN"} — ${v.count} events, head ${engine.head?.slice(0, 12)}.`,
      [{ source: "engine/verify", head: engine.head }]
    );
  }

  return refuse("no governed source matches this question — try rank, capacity, funded, metrics, docs, or Product Context");
}

function cite(answer, citations) {
  return { ok: true, answer, citations };
}

function refuse(reason) {
  return { ok: false, refused: true, reason };
}

function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function inferPlanningGroup(q) {
  if (q.includes("payments")) return "Payments";
  if (q.includes("growth")) return "Growth";
  if (q.includes("core platform")) return "Core Platform";
  if (q.includes("developer")) return "Developer Platform";
  if (q.includes("trust") || q.includes("safety")) return "Trust";
  return null;
}

function inferProduct(q) {
  if (q.includes("checkout")) return "checkout";
  if (q.includes("account")) return "account";
  if (q.includes("platform")) return "platform";
  if (q.includes("marketplace")) return "marketplace";
  return null;
}

function inferPatId(q) {
  if (q.includes("checkout")) return "checkout";
  if (q.includes("account")) return "account-hub";
  if (q.includes("platform")) return "platform-core";
  return null;
}