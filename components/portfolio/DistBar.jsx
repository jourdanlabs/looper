// DistBar — one row of a horizontal distribution chart, pure CSS, no chart lib.
// A mono label, a hard-edged track whose fill is sized by `pct`, and a right-
// aligned count/value readout. The single green accent is reserved for the row
// the caller marks `accent` (e.g. the structural answer); every other row is
// monochrome ink-fill, by design.
//
//   <DistBar label="Direct Customer Revenue" pct={47} value="$7.5M" count={2} />
//   <DistBar label="Strategic-Optionality" pct={0} count={0} accent="open" zeroNote="no growth bets funded" />
//
// Deterministic: width is a literal of the pct passed in. No randomness, no
// measurement — what the engine computed is what renders.

export default function DistBar({
  label,
  pct = 0,
  value,
  count,
  accent = "ink",
  zeroNote,
}) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  const fillClass = accent === "green" ? "pf-bar-fill green" : "pf-bar-fill ink";
  const empty = w === 0;

  return (
    <div className="pf-bar">
      <div className="pf-bar-top">
        <span className="pf-bar-label">{label}</span>
        <span className="pf-bar-read mono">
          {value != null && <span className="pf-bar-val">{value}</span>}
          {count != null && <span className="muted">{count}</span>}
          <span className="pf-bar-pct">{w}%</span>
        </span>
      </div>
      <div className="pf-track" role="img" aria-label={`${label}: ${w}%`}>
        {!empty && <span className={fillClass} style={{ width: `${w}%` }} />}
        {empty && zeroNote && <span className="pf-zero-note label">{zeroNote}</span>}
      </div>
    </div>
  );
}
