import { prioritize } from "../engine.mjs";
import { loadInitiatives } from "./initiatives.mjs";

/** Load initiatives (Jira or seed) and run the full pipeline. */
export async function runPrioritize(opts = {}) {
  const { initiatives, meta } = await loadInitiatives();
  const result = prioritize(initiatives, opts);
  return { result, initiatives, meta };
}