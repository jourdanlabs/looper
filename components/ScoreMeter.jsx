// ScoreMeter — the hard-edged 0–100 score bar + numeral. Drop it in a table
// cell or a row. The fill is the single green accent.
//
//   <ScoreMeter score={67} />

export default function ScoreMeter({ score = 0, width = 90, ...rest }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <span className="meter" {...rest}>
      <span className="track" style={{ width }}>
        <span className="fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="v">{Math.round(pct)}</span>
    </span>
  );
}
