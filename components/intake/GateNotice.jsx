"use client";

// GateNotice — the Draft→Submitted evidence gate, rendered honestly.
//
// The verdict is the real engine's: lib/rubric.mjs canSubmit() decides; this
// component only displays it. When evidence is missing for a claim that was
// made, it renders the CADMUS REFUSAL (the hatched .notice.refusal) and lists
// every missing requirement by its rubric label. When structural fields are
// absent it surfaces those too. Clean drafts get the green clear-to-submit.
//
// Refusal is a feature here: an incomplete or unstructured ask does not become
// Submitted. No source, no submission.

import { Label, Mono, StatDot } from "../index.js";

export default function GateNotice({ gate, structuralMissing = [] }) {
  const evidenceMissing = gate?.missing ?? [];
  const blocked = !gate?.allowed || structuralMissing.length > 0;

  if (!blocked) {
    return (
      <div className="notice" style={{ borderColor: "var(--green)" }}>
        <Label className="label" ink>
          <StatDot tone="green" /> Clear · Draft → Submitted
        </Label>
        <div style={{ marginTop: "0.35rem" }}>
          Every claim cites its evidence and the structural rubric is complete.
          This initiative is eligible to enter the queue as{" "}
          <Mono>Submitted</Mono>.
        </div>
      </div>
    );
  }

  return (
    <div className="notice refusal">
      <Label className="label" ink>
        <StatDot tone="ink" /> Refused · Draft → Submitted blocked
      </Label>
      <div style={{ marginTop: "0.35rem" }}>
        Evidence is enforced <em>at submission, not at review</em>. The failure
        mode this kills is the number with no source behind it. Resolve the
        items below — then the gate opens. No source, no submission.
      </div>

      {structuralMissing.length > 0 && (
        <div style={{ marginTop: "0.7rem" }}>
          <Label>Structural — required fields missing</Label>
          <ul className="mono" style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
            {structuralMissing.map((f) => (
              <li key={f} style={{ fontSize: "0.82rem" }}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidenceMissing.length > 0 && (
        <div style={{ marginTop: "0.7rem" }}>
          <Label>Evidence — claimed but unsourced</Label>
          <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
            {evidenceMissing.map((m) => (
              <li key={m.field} style={{ fontSize: "0.85rem" }}>
                <strong>{m.label}</strong>{" "}
                <span className="muted">
                  (field <Mono>{m.field}</Mono>)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
