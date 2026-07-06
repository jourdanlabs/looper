// /audit — the hash-chained decision ledger (the engine's memory layer, §7).
//
// SYSTEM AUDIT // LOG_TERMINAL. The control surface. Every intake, dedup hold,
// score, allocation, and tier on this surface was appended to a SHA-256 hash
// chain as it happened; verify() walks that chain and proves it hasn't been
// quietly rewritten. The page renders three things, all read straight off the
// engine result — nothing recomputed:
//
//   1. verify() status + chain stats (head, event count, kinds) — the green
//      "SYSTEM INTEGRITY: VERIFIED" banner is the live verify() result.
//   2. The full event stream — every event with seq / kind / sha / prev and a
//      mono payload summary, in the Stitch terminal-log grid. PREV chaining is
//      shown on expand so tamper-evidence is visible.
//   3. "Why was X benched?" — resolve any initiative to its receipt: rank,
//      score, funding outcome, capacity-at-decision, and the sha of every event
//      it touched.
//
// The engine is server-only (node:crypto), so we build plain, serializable props
// for the client terminal here and hand them down. If the chain ever broke, we
// render that honestly rather than papering over it.

import { money } from "../../lib/brief.mjs";
import { runPrioritize } from "../../lib/store/run.mjs";
import AuditTerminal from "../../components/audit/AuditTerminal.jsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit · LOOPER" };

// The terminal "ACTION_VCTR" label for each chain kind.
const KIND_LABEL = {
  INITIATIVE_INTAKEN: "INITIATIVE_INTAKEN",
  INTAKEN: "INTAKEN",
  DUPLICATE_FLAGGED: "DUPLICATE_FLAGGED",
  SCORED: "SCORED",
  PRIORITIZED: "PRIORITIZED",
  TIERED: "TIERED",
  METHODOLOGY_PUBLISHED: "METHODOLOGY_PUBLISHED",
  RANKING_PUBLISHED: "RANKING_PUBLISHED",
  BACKLOG_AUTOMATION: "BACKLOG_AUTOMATION",
  PPO_REQUESTED: "PPO_REQUESTED",
  SPEC_DRAFTED: "SPEC_DRAFTED",
};

// Render each event's payload into a single, honest mono line. Reads only what
// the engine actually wrote (see the append() calls in intake/dedup/score/
// allocate/tier). No invented fields.
function summarize(e) {
  const p = e.payload || {};
  switch (e.kind) {
    case "INITIATIVE_INTAKEN":
      return `${p.id} accepted · ${p.area} · ${p.valueType}`;
    case "DUPLICATE_FLAGGED":
      return `outcome "${p.outcome}" · keep ${p.primary}, hold ${(p.duplicates || []).join(", ") || "—"}`;
    case "SCORED":
      return `${p.id} score ${p.score} · NPV ${money(p.npvTotal)} · ${p.methodologyVersion}`;
    case "PRIORITIZED":
      return `${p.id} #${p.rank} → ${p.funding}${p.mandate ? " (mandate)" : ""} · ${p.teams} team(s) · cap ${p.capacity_used_after}/${p.capacity_at_decision}`;
    case "TIERED":
      return `${p.id} → ${p.tier} · score ${p.score}${p.mandate ? " (mandate)" : ""}`;
    case "METHODOLOGY_PUBLISHED":
      return `version ${p.version || "?"}${p.why ? ` · "${p.why}"` : ""}`;
    case "SPEC_DRAFTED":
      return `${p.id} specced · ${p.acceptance_count} AC · ${p.constraint_count} constraints · ${p.open_count} open · ${p.verdict} · ${(p.spec_receipt || "").slice(0, 8)}`;
    default:
      return JSON.stringify(p);
  }
}

export default async function AuditPage() {
  const { result: r } = await runPrioritize({ capacity: 12 });
  const events = r.ledger.events;

  // 1) Serializable event stream for the client terminal. Each row carries the
  //    load-bearing payload fields the detail panel renders, plus the id it
  //    touches (used by the hash/user filter parity).
  const streamEvents = events.map((e) => {
    const p = e.payload || {};
    return {
      seq: e.seq,
      kind: e.kind,
      kindLabel: KIND_LABEL[e.kind] || e.kind,
      sha: e.sha,
      prev: e.prev, // null on genesis
      summary: summarize(e),
      id: p.id || (e.kind === "DUPLICATE_FLAGGED" ? p.primary : "") || "",
      // value-coded tone for the terminal: green for a Now-tier / FUNDED outcome,
      // ink for the rest. No new hues — exactly the Stitch secondary accent.
      tone:
        (e.kind === "TIERED" && p.tier === "Now") ||
        (e.kind === "PRIORITIZED" && p.funding === "FUNDED")
          ? "green"
          : e.kind === "DUPLICATE_FLAGGED" ||
            (e.kind === "PRIORITIZED" && p.funding === "HELD_DUPLICATE")
          ? "hold"
          : "ink",
      mandate: p.mandate === true,
    };
  });

  const kinds = [...new Set(events.map((e) => e.kind))].map((k) => ({
    kind: k,
    label: KIND_LABEL[k] || k,
    count: events.filter((e) => e.kind === k).length,
  }));

  // 2) The "why was X benched?" receipt index — one fully-resolved record per
  //    ranked initiative, built from its own tags + the events it touched.
  const receipts = r.ranked.map((it) => {
    const prioritized = events.find(
      (e) => e.kind === "PRIORITIZED" && e.payload?.id === it.id
    );
    const pp = prioritized?.payload || {};
    const heldCluster = r.clusters.find((c) => c.duplicates.includes(it.id));
    return {
      id: it.id,
      title: it.title,
      area: it.area,
      sponsor: it.sponsor,
      valueType: it.valueType,
      outcome: it.outcome,
      rank: it._rank,
      score: it._score,
      priorityRaw: it._breakdown?.priorityRaw ?? it._priorityRaw,
      funding: it._funding,
      dedup: it._dedup,
      tier: it._tier,
      mandate: it.mandate === true,
      teams: it._teams ?? pp.teams,
      capacityAtDecision: pp.capacity_at_decision ?? r.capacity,
      capacityUsed: pp.capacity_used_after ?? r.capacityUsed,
      npvTotal: it._breakdown?.npv?.total ?? 0,
      npvMoney: money(it._breakdown?.npv?.total ?? 0),
      methodologyVersion: it._breakdown?.methodologyVersion ?? r.methodology_version,
      heldNote: heldCluster
        ? `Same outcome as ${heldCluster.primary}; funded the primary, held the rest.`
        : null,
      // The receipt trail: every event on the chain carrying this id.
      events: r.ledger.receiptsFor(it.id).map((rec) => {
        const ev = events.find((e) => e.sha === rec.sha);
        return {
          kind: rec.kind,
          kindLabel: KIND_LABEL[rec.kind] || rec.kind,
          seq: ev?.seq ?? -1,
          sha: rec.sha,
        };
      }),
    };
  });

  const refused = r.rejected.map((x) => ({
    id: x.id,
    title: x.title,
    errors: x.errors || [],
  }));

  return (
    <AuditTerminal
      events={streamEvents}
      kinds={kinds}
      receipts={receipts}
      refused={refused}
      verify={r.verify}
      head={r.head || ""}
      methodologyVersion={r.methodology_version}
      stats={{
        intake: r.stats.intake,
        rejected: r.stats.rejected,
        funded: r.stats.funded,
        benched: r.stats.benched,
        held: r.stats.held_duplicates,
        kinds: kinds.length,
        total: events.length,
      }}
    />
  );
}
