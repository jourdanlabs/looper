// Card — a sharp, hairline-bordered panel. The default surface for grouping
// content. Optional title/right-slot render a header rule.
//
//   <Card title="Funded" right={<Label>6 items</Label>}> … </Card>
//   <Card flush> …table… </Card>   // no inner padding (for full-bleed tables)

export default function Card({ title, right, flush = false, className = "", children, ...rest }) {
  return (
    <section className={`card${flush ? " flush" : ""}${className ? " " + className : ""}`} {...rest}>
      {(title || right) && (
        <div className="card-head" style={flush ? { padding: "1.1rem 1.2rem 0.6rem" } : undefined}>
          {title ? <div className="card-title">{title}</div> : <span />}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
