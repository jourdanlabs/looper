"use client";

// ReceiptLookup — the "why was X benched?" instrument.
//
// The engine is server-only (node:crypto), so the /audit page server component
// builds a fully-resolved, plain-serializable receipt index and hands it to this
// client component. Nothing is recomputed here — every number on screen is read
// straight off the receipts the chain already recorded. Picking an initiative
// resolves it to its decision: rank, score, funding outcome, capacity-at-decision,
// the held/duplicate note where applicable, and the sha of every event it touched.
//
// Receipts everywhere: a decision you can't reproduce is a vibe, not a record.

import { useMemo, useState } from "react";
import { Label, Mono, ScoreMeter, TierBadge, FundingBadge, StatDot } from "../index.js";

const FUND_NOTE = {
  FUNDED: "Funded against capacity — it cleared the line.",
  BENCHED: "Below the capacity line: priority N+1 lost to priority N. Not disliked — out-ranked.",
  HELD_DUPLICATE: "Held behind a stronger primary with the same outcome — the org funds one build, not three.",
};

export default function ReceiptLookup({ receipts, refused }) {
  // receipts: [{ id, title, area, sponsor, valueType, outcome, rank, score,
  //   priorityRaw, funding, dedup, tier, mandate, teams, capacityAtDecision,
  //   capacityUsedAfter, npvTotal, methodologyVersion, primaryOf, heldNote,
  //   events:[{ kind, seq, sha }] }]
  const ids = useMemo(() => receipts.map((r) => r.id), [receipts]);
  const refusedIds = useMemo(() => new Set((refused || []).map((r) => r.id)), [refused]);
  const [selected, setSelected] = useState(receipts[0]?.id ?? "");

  const hit = receipts.find((r) => r.id === selected);
  const refusedHit = (refused || []).find((r) => r.id === selected);

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <div className="field" style={{ marginBottom: 0 }}>
        <Label as="label" htmlFor="receipt-lookup">
          Resolve an initiative to its receipt
        </Label>
        <select
          id="receipt-lookup"
          className="select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <optgroup label="On the chain (intaken)">
            {receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.title} — {r.funding === "FUNDED" ? "Funded" : r.funding === "BENCHED" ? "Benched" : "Held"} (#{r.rank})
              </option>
            ))}
          </optgroup>
          {refused && refused.length > 0 && (
            <optgroup label="Refused at intake (never reached the chain)">
              {refused.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.title} — Refused
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {hit && <ReceiptCard r={hit} />}

      {!hit && refusedHit && <RefusedCard r={refusedHit} />}
    </div>
  );
}

function row(label, value) {
  return (
    <div className="spread" style={{ borderBottom: "1px solid var(--line-soft)", padding: "0.45rem 0" }}>
      <Label>{label}</Label>
      <div className="mono" style={{ textAlign: "right" }}>{value}</div>
    </div>
  );
}

function ReceiptCard({ r }) {
  const benched = r.funding === "BENCHED";
  const held = r.funding === "HELD_DUPLICATE";
  return (
    <div className="well" style={{ padding: "1rem 1.1rem" }}>
      <div className="spread" style={{ alignItems: "flex-start", marginBottom: "0.6rem" }}>
        <div>
          <div className="row-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <Mono>{r.id}</Mono>
            <TierBadge tier={r.tier} />
            <FundingBadge funding={r.funding} />
            {r.mandate && <span className="badge green-soft">Mandate</span>}
          </div>
          <div style={{ fontWeight: 600, marginTop: "0.35rem" }}>{r.title}</div>
          <Label style={{ display: "block", marginTop: "0.2rem" }}>
            {r.area} · {r.valueType}
          </Label>
        </div>
        <ScoreMeter score={r.score} />
      </div>

      <div className="notice" style={{ marginBottom: "0.8rem" }}>
        <Label style={{ display: "block", marginBottom: "0.2rem" }}>The decision</Label>
        {FUND_NOTE[r.funding]}
        {held && r.heldNote ? ` ${r.heldNote}` : ""}
      </div>

      {row("Global rank", `#${r.rank}`)}
      {row("Display score", `${r.score} / 100`)}
      {row("Funding outcome", r.funding)}
      {row("Tier", r.tier)}
      {row("Capacity at decision", `${r.capacityUsed}/${r.capacityAtDecision} teams used`)}
      {row("Teams this item asks", `${r.teams}`)}
      {benched &&
        row(
          "Why benched (the number)",
          `${r.capacityUsed}/${r.capacityAtDecision} already committed when #${r.rank} came up`
        )}
      {row("3-yr NPV impact", r.npvMoney)}
      {row("Methodology version", r.methodologyVersion)}

      <Label style={{ display: "block", margin: "0.9rem 0 0.4rem" }}>
        Receipt trail — every event this id touched
      </Label>
      <div className="stack" style={{ gap: "0.3rem" }}>
        {r.events.map((e) => (
          <div key={e.sha} className="row-flex" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <StatDot tone="ink" />
            <Mono>{KIND_LABEL[e.kind] || e.kind}</Mono>
            <span className="muted mono" style={{ fontSize: "0.72rem" }}>seq {e.seq}</span>
            <Mono receipt>{e.sha.slice(0, 16)}</Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefusedCard({ r }) {
  return (
    <div className="notice refusal">
      <Label style={{ display: "block", marginBottom: "0.3rem" }}>
        Refused at intake — no receipt on the chain
      </Label>
      <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>
        {r.id} · {r.title}
      </div>
      <p style={{ marginBottom: "0.4rem" }}>
        This submission never entered the queue, so there is no ranking receipt to look up.
        &ldquo;If it&rsquo;s not in the system, it doesn&rsquo;t exist.&rdquo; The door rejected it
        for:
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
        {r.errors.map((err, i) => (
          <li key={i} className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>
            {err}
          </li>
        ))}
      </ul>
    </div>
  );
}

const KIND_LABEL = {
  INITIATIVE_INTAKEN: "INTAKE",
  DUPLICATE_FLAGGED: "DUPLICATE_FLAGGED",
  SCORED: "SCORED",
  PRIORITIZED: "PRIORITIZED",
  TIERED: "TIERED",
  METHODOLOGY_PUBLISHED: "METHODOLOGY_PUBLISHED",
};
