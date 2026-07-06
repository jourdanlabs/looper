// StatDot — a small square status indicator (the design system is value-coded,
// so "color" here is really green-accent vs ink vs muted vs open).
//
//   <StatDot tone="green" />   funded / verified / on
//   <StatDot tone="ink" />     held / solid
//   <StatDot tone="muted" />   benched / inactive
//   <StatDot tone="open" />    empty / pending
//
// Optional `label` renders the dot inline with a mono caption.

const TONES = new Set(["green", "ink", "muted", "open"]);

export default function StatDot({ tone = "open", label, className = "", ...rest }) {
  const t = TONES.has(tone) ? tone : "open";
  const dot = <span className={`dot ${t}${className ? " " + className : ""}`} aria-hidden="true" {...rest} />;
  if (!label) return dot;
  return (
    <span className="row-flex" style={{ gap: "0.4rem" }}>
      {dot}
      <span className="label">{label}</span>
    </span>
  );
}
