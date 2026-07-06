"use client";

// EventStream — the append-only hash chain, rendered as a receipt-like grid.
//
// Every row is one ledger event exactly as the chain recorded it: seq, kind,
// the sha (this event's receipt), and prev (the link to the event before it).
// The first event has prev = (genesis); each subsequent prev must equal the
// prior row's sha — that visible continuity IS the tamper-evidence. A mono
// summary renders the payload's load-bearing fields without inventing anything.
//
// The kind filter is presentational only; it never touches the chain or the
// verify() result shown above it.

import { useMemo, useState } from "react";
import { Label, Mono } from "../index.js";

const KIND_LABEL = {
  INITIATIVE_INTAKEN: "INTAKE",
  DUPLICATE_FLAGGED: "DUPLICATE_FLAGGED",
  SCORED: "SCORED",
  PRIORITIZED: "PRIORITIZED",
  TIERED: "TIERED",
  METHODOLOGY_PUBLISHED: "METHODOLOGY_PUBLISHED",
};

export default function EventStream({ events, brokeAt }) {
  // events: [{ seq, kind, sha, prev, summary }]
  const kinds = useMemo(() => {
    const seen = [];
    for (const e of events) if (!seen.includes(e.kind)) seen.push(e.kind);
    return seen;
  }, [events]);

  const [active, setActive] = useState(() => new Set(kinds));

  const toggle = (k) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const allOn = active.size === kinds.length;
  const showAll = () => setActive(new Set(kinds));

  const shown = events.filter((e) => active.has(e.kind));

  return (
    <div className="stack" style={{ gap: "0.8rem" }}>
      <div className="row-flex" style={{ flexWrap: "wrap", gap: "0.4rem" }}>
        <Label style={{ marginRight: "0.3rem" }}>Filter kind</Label>
        <button
          type="button"
          className={`btn${allOn ? " primary" : ""}`}
          style={{ padding: "0.28rem 0.6rem" }}
          onClick={showAll}
        >
          All
        </button>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`btn${active.has(k) ? " primary" : ""}`}
            style={{ padding: "0.28rem 0.6rem" }}
            onClick={() => toggle(k)}
          >
            {KIND_LABEL[k] || k}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th className="rank">Seq</th>
              <th>Kind</th>
              <th>Decision (payload)</th>
              <th>SHA · receipt</th>
              <th>Prev · link</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => {
              const broken = brokeAt != null && e.seq === brokeAt;
              return (
                <tr key={e.sha} className={broken ? "held" : undefined}>
                  <td className="rank">{e.seq}</td>
                  <td>
                    <Mono>{KIND_LABEL[e.kind] || e.kind}</Mono>
                  </td>
                  <td className="muted mono" style={{ fontSize: "0.8rem" }}>
                    {e.summary}
                  </td>
                  <td>
                    <Mono receipt>{e.sha.slice(0, 16)}</Mono>
                  </td>
                  <td>
                    {e.prev ? (
                      <Mono receipt>{e.prev.slice(0, 16)}</Mono>
                    ) : (
                      <span className="badge muted">genesis</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center", padding: "1.2rem" }}>
                  No events match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Label className="muted">
        {shown.length} of {events.length} events shown · each row&rsquo;s PREV equals the prior
        row&rsquo;s SHA — that continuity is the tamper-evidence
      </Label>
    </div>
  );
}
