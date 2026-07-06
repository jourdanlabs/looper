// Mono — inline monospaced text with tabular numerals. For ids, hashes,
// numbers, dial values. Pass `receipt` to render the boxed receipt-code chip.
//
//   <Mono>INIT-001</Mono>
//   <Mono receipt>{sha.slice(0,12)}</Mono>

export default function Mono({ receipt = false, className = "", children, ...rest }) {
  const cls = receipt ? "receipt" : "mono";
  return (
    <span className={`${cls}${className ? " " + className : ""}`} {...rest}>
      {children}
    </span>
  );
}
