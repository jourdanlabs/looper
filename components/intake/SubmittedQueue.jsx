"use client";

// SubmittedQueue — the local, in-session list of items that cleared the gate.
//
// HONEST SCOPE: v1 has no backend persistence. A submission that passes
// canSubmit() is appended to this client-side list to show what WOULD enter the
// prioritization queue (intake → dedup → score → tier → allocate, on the Board).
// Nothing is written to the ledger here; the Board route owns the chain. This
// list resets on reload. That's the truth, stated on the surface.

import { Label, Mono, ScoreMeter, StatDot } from "../index.js";

export default function SubmittedQueue({ items, onClear }) {
  return (
    <div className="card flush">
      <div className="card-head" style={{ padding: "1.1rem 1.2rem 0.6rem" }}>
        <div className="card-title">Submitted this session</div>
        <div className="row-flex" style={{ gap: "0.6rem" }}>
          <Label>{items.length} queued</Label>
          {items.length > 0 && (
            <button className="btn" type="button" onClick={onClear}>
              Clear
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="muted" style={{ padding: "0 1.2rem 1.2rem", fontSize: "0.88rem" }}>
          Nothing submitted yet. A draft that clears the evidence gate lands here
          and would enter the prioritization queue on the Board. Synthetic /
          in-session only — no backend persistence in v1.
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "2rem" }} />
              <th>ID</th>
              <th>Title</th>
              <th>Value type</th>
              <th className="num">Score</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.key}>
                <td>
                  <StatDot tone="green" />
                </td>
                <td>
                  <Mono>{row.id}</Mono>
                </td>
                <td>{row.title}</td>
                <td className="muted">{row.valueType || "—"}</td>
                <td className="num">
                  <ScoreMeter score={row.score} width={70} />
                </td>
                <td>
                  <span className="badge green-soft">{row.state}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {items.length > 0 && (
        <div
          className="muted"
          style={{ padding: "0.7rem 1.2rem 1.1rem", fontSize: "0.72rem" }}
        >
          Would enter the queue on the Board (intake → dedup → score → tier →
          allocate). Not persisted; not yet on the ledger — this is the intake
          waiting room, honestly local.
        </div>
      )}
    </div>
  );
}
