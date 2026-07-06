// Initiative source — seed (demo) or live Jira pull.

import { INITIATIVES as SEED } from "../../seed/initiatives.mjs";
import { jiraConfig } from "../jira/config.mjs";
import { pullInitiativesFromJira } from "../jira/sync.mjs";

/**
 * Load initiatives for the engine.
 * - Jira configured → live pull (functional v1)
 * - Otherwise → synthetic seed (demo mode)
 */
export async function loadInitiatives() {
  const cfg = jiraConfig();
  if (cfg.enabled) {
    const pulled = await pullInitiativesFromJira(cfg);
    return {
      initiatives: pulled.initiatives.length ? pulled.initiatives : SEED,
      meta: {
        mode: pulled.initiatives.length ? "jira" : "jira-fallback-seed",
        ...pulled,
      },
    };
  }

  return {
    initiatives: SEED,
    meta: {
      mode: "stub",
      source: "seed",
      count: SEED.length,
      reason: "Jira stub mode — synthetic portfolio until credentials are set",
      jira: { intake: "INTAKE", ppo: "GOV" },
    },
  };
}

/** Sync loader for pages that cannot await (uses seed only). Prefer loadInitiatives(). */
export function loadInitiativesSync() {
  return { initiatives: SEED, meta: { mode: "seed", count: SEED.length } };
}