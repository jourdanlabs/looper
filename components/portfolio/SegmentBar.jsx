// SegmentBar — a single stacked horizontal bar that shows a whole-of-100
// composition in one strip (the "mix" view). Pure CSS, no chart lib. Segments
// are value-coded by ordinal shade (monochrome ink ramp) with the single green
// reserved for the segment the caller flags `accent`. A hairline legend below
// names each segment with its pct.
//
//   <SegmentBar
//     segments={[
//       { key: "Direct Customer Revenue", pct: 47, accent: true },
//       { key: "Direct Customer Service", pct: 23 },
//       ...
//     ]}
//   />
//
// Deterministic: segment widths are literals of the pcts passed in. Zero-pct
// segments are dropped from the strip but kept in the legend (so "0% funded"
// stays visible — that's the structural point).

const SHADES = ["ink-0", "ink-1", "ink-2", "ink-3", "ink-4"];

export default function SegmentBar({ segments = [], unit = "%" }) {
  const drawn = segments.filter((s) => (Number(s.pct) || 0) > 0);

  return (
    <div className="pf-seg-wrap">
      <div className="pf-seg-strip" role="img" aria-label="composition">
        {drawn.map((s, i) => {
          const w = Math.max(0, Math.min(100, Number(s.pct) || 0));
          const cls = s.accent ? "pf-seg green" : `pf-seg ${SHADES[i % SHADES.length]}`;
          return (
            <span
              key={s.key}
              className={cls}
              style={{ width: `${w}%` }}
              title={`${s.key}: ${w}${unit}`}
            />
          );
        })}
      </div>
      <div className="pf-seg-legend">
        {segments.map((s, i) => {
          const drawnIdx = drawn.findIndex((d) => d.key === s.key);
          const swatch = s.accent
            ? "pf-swatch green"
            : drawnIdx >= 0
              ? `pf-swatch ${SHADES[drawnIdx % SHADES.length]}`
              : "pf-swatch open";
          return (
            <span className="pf-leg-item" key={s.key}>
              <span className={swatch} aria-hidden="true" />
              <span className="label-ink mono pf-leg-name">{s.key}</span>
              <span className="muted mono">
                {Math.max(0, Math.min(100, Number(s.pct) || 0))}
                {unit}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
