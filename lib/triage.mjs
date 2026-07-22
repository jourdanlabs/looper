// HL Prioritization OS — TRIAGE (pillar ownership + do / kill / discover).
//
// After a request is scored, it is routed to a PILLAR owner, and the tool
// SUGGESTS one of three dispositions so a product manager has a clear starting
// decision on day one instead of "we don't know what to do":
//
//   ACCEPT             — score is clearly strong (or it's a hard mandate). Do it.
//   KILL               — score is clearly weak and there's no mandate. Stop it.
//   REQUIRES_DISCOVERY — genuinely uncertain: middle-band score, low confidence,
//                        or unanswered intake factors. A PM resolves the
//                        uncertainty and writes a decision brief.
//
// HUMAN-IN-THE-LOOP: this is a SUGGESTION, not a verdict. The pillar lead owns
// the final call and can override — the suggestion exists so no one is stuck at
// a blank page. Every suggestion carries its reason, so an override is a
// documented decision, not a vibe.
//
// The pillar map is the ONE config to set for a real launch: which pillar owns
// which domain. Until set, an item routes by an explicit `pillar` field, else by
// area, else "Unassigned".

export const PILLARS = Object.freeze(["Seth", "Priya", "Andrea", "Pallavi", "Barry"]);

export const DISPOSITION = Object.freeze({
  ACCEPT: "Accept",
  KILL: "Kill",
  DISCOVERY: "Requires Discovery",
});

// Domain → pillar owner. FILL THIS IN with the real ownership at launch. Keys are
// matched case-insensitively against an item's `area` (or `domain`). Anything
// unmatched (and with no explicit `it.pillar`) routes to "Unassigned" so it's
// visible, never silently dropped.
export const DEFAULT_PILLAR_MAP = Object.freeze({
  // "growth": "Seth", "servicing": "Priya", "risk": "Andrea", ...
});

// Suggestion thresholds on the 0..100 base score. Tunable to match the launch.
export const TRIAGE_BANDS = Object.freeze({
  acceptAtOrAbove: 65, // clearly strong → Accept
  killBelow: 30, // clearly weak, no mandate → Kill
  // between the two → Requires Discovery
  lowConfidenceSignal: 0.5, // confidence factor below this pushes to Discovery
});

/** Route one item to a pillar owner. Explicit `pillar` wins, else area map. */
export function pillarFor(item, pillarMap = DEFAULT_PILLAR_MAP) {
  if (item.pillar && PILLARS.includes(item.pillar)) return item.pillar;
  const key = String(item.area ?? item.domain ?? "").trim().toLowerCase();
  for (const [k, v] of Object.entries(pillarMap)) {
    if (k.toLowerCase() === key && PILLARS.includes(v)) return v;
  }
  return "Unassigned";
}

/**
 * Suggest a disposition for a scored item. Pure.
 * @param {object} scored  a baseScore()/scoreRequest() result (has baseScore,
 *   factors, unanswered), optionally merged with the raw item (mandate).
 * @param {object} [bands]
 * @returns {{ disposition, pmRequired:boolean, reason:string, confidence:string }}
 */
export function suggestDisposition(scored, bands = TRIAGE_BANDS) {
  const score = num(scored.adjustedScore ?? scored.baseScore);
  const mandate = scored.mandate === true;
  const unanswered = Array.isArray(scored.unanswered) ? scored.unanswered : [];
  const confFactor = (scored.factors || []).find((f) => f.key === "confidence");
  const lowConfidence = confFactor ? confFactor.signal < bands.lowConfidenceSignal : false;

  // Hard mandate is a must-do — accept regardless of score (the number is still
  // shown for transparency; the carve-out moves the decision, not the score).
  if (mandate) {
    return decide(DISPOSITION.ACCEPT, false, `Regulatory/mandate — must-do (score ${score}, shown for transparency).`, "high");
  }
  // Missing intake answers → you can't responsibly kill or accept; discover.
  if (unanswered.length) {
    return decide(DISPOSITION.DISCOVERY, true, `Unanswered intake factor(s): ${unanswered.join(", ")}. A PM resolves before disposition.`, "unknown");
  }
  if (score >= bands.acceptAtOrAbove && !lowConfidence) {
    return decide(DISPOSITION.ACCEPT, false, `Strong score (${score} ≥ ${bands.acceptAtOrAbove}) with adequate confidence.`, "high");
  }
  if (score < bands.killBelow) {
    return decide(DISPOSITION.KILL, false, `Weak score (${score} < ${bands.killBelow}) and no mandate.`, "high");
  }
  // Middle band, or strong-but-low-confidence → discover.
  const why = lowConfidence
    ? `Score ${score} but delivery/value confidence is low — a PM should de-risk before committing.`
    : `Score ${score} is in the discovery band (${bands.killBelow}–${bands.acceptAtOrAbove}). A PM defines scope and returns a decision.`;
  return decide(DISPOSITION.DISCOVERY, true, why, lowConfidence ? "low" : "medium");
}

/** Full triage of one scored item: pillar + suggested disposition. */
export function triageItem(scored, opts = {}) {
  const pillar = pillarFor(scored, opts.pillarMap ?? DEFAULT_PILLAR_MAP);
  const suggestion = suggestDisposition(scored, opts.bands ?? TRIAGE_BANDS);
  return {
    id: scored.id ?? null,
    title: scored.title ?? null,
    score: num(scored.adjustedScore ?? scored.baseScore),
    pillar,
    suggested: suggestion.disposition,
    pmRequired: suggestion.pmRequired,
    reason: suggestion.reason,
    confidence: suggestion.confidence,
    humanDecision: null, // filled by the pillar lead — this is a suggestion only
  };
}

/** Triage a batch, grouped by pillar for the board readout. */
export function triageAll(scoredItems, opts = {}) {
  const rows = scoredItems.map((s) => triageItem(s, opts));
  const byPillar = {};
  for (const r of rows) (byPillar[r.pillar] ??= []).push(r);
  const counts = rows.reduce((a, r) => ((a[r.suggested] = (a[r.suggested] || 0) + 1), a), {});
  return { rows, byPillar, counts };
}

function decide(disposition, pmRequired, reason, confidence) {
  return { disposition, pmRequired, reason, confidence };
}
function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
