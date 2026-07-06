// money() — the same compact dollar formatter the engine's brief uses
// (lib/brief.mjs), re-expressed here as a tiny pure helper so the client Board
// component never has to import a server-only module. Deterministic, no I/O.
//
//   money(7_200_000) -> "$7.2M"   money(480_000) -> "$480k"   money(0) -> "$0"

export function money(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${round1(v / 1_000_000)}M`;
  if (abs >= 1_000) return `$${round1(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
