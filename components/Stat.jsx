// Stat / StatGroup — the big-number readout strip. Wrap several <Stat> in a
// <StatGroup> to get the hairline-divided row used on every page header.
//
//   <StatGroup>
//     <Stat n={6} label="funded" green />
//     <Stat n="$16.1M" label="funded npv" />
//   </StatGroup>

export function StatGroup({ className = "", children, ...rest }) {
  return (
    <div className={`stats${className ? " " + className : ""}`} {...rest}>
      {children}
    </div>
  );
}

export default function Stat({ n, label, green = false, ...rest }) {
  return (
    <div className="stat" {...rest}>
      <div className={`n${green ? " green" : ""}`}>{n}</div>
      <div className="l">{label}</div>
    </div>
  );
}
