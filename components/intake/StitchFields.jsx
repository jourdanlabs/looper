"use client";

// StitchFields — the brutalist intake field primitives, styled to the Stitch
// "NEW SUBMISSION // UNVERIFIED" mock.
//
// Two input idioms from Stitch:
//   • UNDERLINE fields  — full-width identity / text inputs: a single bottom
//     hairline, transparent ground, no box. (Stitch §01 title/owner/area.)
//   • BOX fields        — the metric inputs in a grid: a full 1px ink box with
//     interior padding. (Stitch §02 RICE_METRICS.)
// Every label is `font-label-caps text-label-caps uppercase`, ink. Required
// fields carry a green `*`. Focus snaps the border to primary (the globals.css
// rule + the Tailwind `focus:border-primary`).
//
// Presentational only — no engine logic. The page owns state; these render it.

export function FieldLabel({ label, req, htmlFor }) {
  return (
    <label
      className="font-label-caps text-label-caps text-primary uppercase flex items-center gap-1"
      htmlFor={htmlFor}
    >
      {label}
      {req && <span className="text-secondary">*</span>}
    </label>
  );
}

// ── Underline text/number/date inputs ───────────────────────────────────────
const UNDERLINE =
  "border-b border-primary bg-transparent py-2 px-0 font-body-md text-body-md text-primary placeholder:text-outline placeholder:uppercase focus:outline-none focus:ring-0 focus:border-primary w-full";
// ── Boxed inputs (the metric grid) ──────────────────────────────────────────
const BOX =
  "border border-primary bg-transparent py-2 px-3 font-data-mono text-data-mono text-primary placeholder:text-outline placeholder:uppercase focus:outline-none focus:ring-0 focus:border-primary w-full";

// Deterministic id from the label so each <label for> wires up. Not a hook.
function fieldId(label) {
  return `f_${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

export function TextField({ label, req, value, onChange, placeholder, span2 }) {
  const id = fieldId(label);
  return (
    <div className={`flex flex-col gap-1 ${span2 ? "md:col-span-2" : ""}`}>
      <FieldLabel label={label} req={req} htmlFor={id} />
      <input
        id={id}
        className={UNDERLINE}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function AreaField({ label, req, value, onChange, placeholder, span2 = true }) {
  const id = fieldId(label);
  return (
    <div className={`flex flex-col gap-1 ${span2 ? "md:col-span-2" : ""}`}>
      <FieldLabel label={label} req={req} htmlFor={id} />
      <textarea
        id={id}
        rows={3}
        className="border border-primary bg-transparent p-3 font-body-md text-body-md text-primary placeholder:text-outline placeholder:uppercase focus:outline-none focus:ring-0 focus:border-primary w-full resize-none"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SelectField({ label, req, value, onChange, options, span2 }) {
  const id = fieldId(label);
  return (
    <div className={`flex flex-col gap-1 ${span2 ? "md:col-span-2" : ""}`}>
      <FieldLabel label={label} req={req} htmlFor={id} />
      <select
        id={id}
        className="border-b border-primary bg-transparent py-2 px-0 font-body-md text-body-md text-primary uppercase focus:outline-none focus:ring-0 focus:border-primary w-full appearance-none cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

// Boxed numeric field for the metric grid (RICE / confidence). Optional $ adorner.
export function NumField({ label, req, value, onChange, placeholder, money }) {
  const id = fieldId(label);
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} req={req} htmlFor={id} />
      {money ? (
        <div className="relative flex items-center border border-primary bg-transparent focus-within:border-primary">
          <span className="pl-3 font-data-mono text-data-mono text-on-surface-variant select-none">
            $
          </span>
          <input
            id={id}
            className="bg-transparent py-2 pl-1 pr-3 font-data-mono text-data-mono text-primary placeholder:text-outline placeholder:uppercase focus:outline-none focus:ring-0 w-full border-0"
            type="number"
            inputMode="decimal"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      ) : (
        <input
          id={id}
          className={BOX}
          type="number"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function DateField({ label, req, value, onChange }) {
  const id = fieldId(label);
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} req={req} htmlFor={id} />
      <input
        id={id}
        className={BOX}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
