// Label — IBM Plex Mono, all-caps, tracked. The system's caption type.
// Use `eyebrow` for a green section kicker.
//
//   <Label>capacity</Label>
//   <Label eyebrow>system of record</Label>
//   <Label as="span" ink>v1.0</Label>

export default function Label({ as: Tag = "span", eyebrow = false, ink = false, className = "", children, ...rest }) {
  const cls = eyebrow ? "eyebrow" : `label${ink ? " label-ink" : ""}`;
  return (
    <Tag className={`${cls}${className ? " " + className : ""}`} {...rest}>
      {children}
    </Tag>
  );
}
