// Dial Board — static UI metadata (client-safe, no engine import).
//
// The actual dial values, defaults, and the value-type list come from the
// engine (lib/dials.mjs + lib/types.mjs) and are passed into the client board
// as props by the server page. THIS file only carries presentational config:
// slider ranges, step sizes, and short captions — plain data the client can
// import without dragging node:crypto into the bundle.

// Slider ranges for the scalar (non-weight) dials. Tuned to the committee's
// realistic tuning band; the engine still resolves/clamps anything out of band.
export const R_RANGE = { min: 0.0, max: 0.2, step: 0.005 }; // discount rate r
export const HORIZON_RANGE = { min: 1, max: 7, step: 1 }; // NPV horizon H (years)
export const CONF_RANGE = { min: 0.5, max: 2.0, step: 0.05 }; // confidence sensitivity
export const WEIGHT_RANGE = { min: 0.0, max: 1.5, step: 0.05 }; // per value-type weight

// Short captions for each value type, keyed by the canonical label. Kept here so
// the client doesn't need the engine just to render a help line.
export const VALUE_TYPE_CAPTION = {
  "Direct Customer Revenue": "Top-line dollars",
  "Direct Customer Service": "CSAT / deflection",
  "Internal Enabler": "Engineering leverage",
  "Risk-Compliance": "Exposure removed",
  "Strategic-Optionality": "Future-build leverage",
};

// The four named committee seats for the (UI-stubbed) 2-of-4 approval gate.
// v1: the approvals are simulated in the browser; V1.5 enforces a real workflow.
export const APPROVERS = [
  { id: "chair", name: "Committee Chair" },
  { id: "eng", name: "Head of Engineering" },
  { id: "finance", name: "Finance Partner" },
  { id: "risk", name: "Risk & Compliance" },
];
export const APPROVAL_THRESHOLD = 2; // 2-of-4

// Format a fraction as a percentage for the discount-rate / sensitivity readouts.
export function pct(n, digits = 1) {
  return `${(Number(n) * 100).toFixed(digits)}%`;
}

// Compact dollar formatting, mirroring lib/brief.mjs money() so the sandbox
// reads the same as the published readout. Pure, client-safe.
export function money(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}
