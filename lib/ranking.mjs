// LOOPER — rescore-all + ranking publish (RANKING_PUBLISHED on the chain).

import { prioritize } from "./engine.mjs";
import { openBacklog } from "./hierarchy.mjs";
import { LEDGER_KINDS } from "./ledger.mjs";

/**
 * Recompute the full open backlog into a single stack-ranked list and seal it.
 * Same inputs → byte-identical order (determinism inherited from prioritize()).
 *
 * @param {Array} initiatives  full portfolio (open subset is scored)
 * @param {object} [opts]
 * @param {string} [opts.who]   operator stamping the publish
 * @param {string} [opts.why]   required reason for publish
 * @param {Array} [opts.beforeRank]  optional prior [{id, rank}] for delta receipt
 */
export function rescoreAll(initiatives, opts = {}) {
  const open = openBacklog(initiatives);
  const result = prioritize(open, opts);

  const ranking = result.ranked.map((it) => ({
    id: it.id,
    rank: it._rank,
    score: it._score,
    tier: it._tier,
    level: it.level,
    planningGroup: it.planningGroup,
  }));

  const delta = opts.beforeRank ? rankDelta(opts.beforeRank, ranking) : null;

  const receipt = result.ledger.append(LEDGER_KINDS.RANKING_PUBLISHED, {
    count: ranking.length,
    methodology_version: result.methodology_version,
    who: opts.who ?? "operator",
    why: opts.why ?? "rescore all open backlog",
    head: result.head,
    ranking,
    delta,
  });

  return {
    ...result,
    published: true,
    rankingReceipt: receipt,
    ranking,
  };
}

/** Propose a ranking without publishing — sandbox path for the AI button UX. */
export function proposeRanking(initiatives, opts = {}) {
  const open = openBacklog(initiatives);
  return prioritize(open, opts);
}

function rankDelta(before, after) {
  const prev = new Map(before.map((r) => [r.id, r.rank]));
  const moved = [];
  for (const row of after) {
    const oldRank = prev.get(row.id);
    if (oldRank !== undefined && oldRank !== row.rank) {
      moved.push({ id: row.id, from: oldRank, to: row.rank });
    }
  }
  return { movedCount: moved.length, moved };
}