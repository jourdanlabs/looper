// /dials/publish — PUBLISH route handler. POST the proposed dials + a required
// "why" + the (UI-stubbed) 2-of-4 approvals. On success this:
//
//   1. runs the full pipeline once to obtain a LIVE ledger that already holds
//      the intake/dedup/score/tier receipts (the real chain, not a stub),
//   2. appends METHODOLOGY_PUBLISHED to that chain via methodology.publish(),
//      which bumps the version (v1.0 → v1.1) and records who/why/before-after,
//   3. verifies the chain and returns the new head + receipt sha.
//
// Governance gate (v1): a non-empty "why" is REQUIRED (publish() throws without
// one) and we require 2-of-4 named approvals here. The approval workflow itself
// is stubbed in v1 (the browser collects the four seats); V1.5 enforces a real
// multi-actor flow. We still enforce the *count* server-side so the demo can't
// publish a silent or unapproved dial change.

import { NextResponse } from "next/server";
import { publish } from "../../../lib/methodology.mjs";
import { loadInitiatives } from "../../../lib/store/initiatives.mjs";
import { prioritize } from "../../../lib/engine.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APPROVAL_THRESHOLD = 2; // 2-of-4

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const {
    currentDials = {},
    proposedDials = {},
    currentVersion = "v1.0",
    who = "unknown",
    why = "",
    approvals = [],
    capacity = 12,
  } = body || {};

  // Governance gate — refuse before touching the chain.
  if (!why || String(why).trim() === "") {
    return NextResponse.json(
      { error: "A 'why' is required. No silent dial changes." },
      { status: 422 }
    );
  }
  const approvalCount = Array.isArray(approvals) ? new Set(approvals).size : 0;
  if (approvalCount < APPROVAL_THRESHOLD) {
    return NextResponse.json(
      {
        error: `Publish requires ${APPROVAL_THRESHOLD}-of-4 approval (have ${approvalCount}). Approval workflow is UI-stubbed in v1.`,
      },
      { status: 422 }
    );
  }

  const { initiatives } = await loadInitiatives();

  // 1) Run the pipeline to get a LIVE ledger that already carries the pipeline
  //    receipts. publish() appends METHODOLOGY_PUBLISHED onto this real chain.
  const base = prioritize(initiatives, {
    capacity,
    dials: currentDials,
    methodologyVersion: currentVersion,
  });

  let out;
  try {
    out = publish(initiatives, {
      ledger: base.ledger,
      currentDials,
      proposedDials,
      currentVersion,
      who,
      why,
      opts: { capacity },
    });
  } catch (err) {
    // e.g. publish() throwing on an empty why (defense in depth).
    return NextResponse.json({ error: String(err.message || err) }, { status: 422 });
  }

  const verify = base.ledger.verify();

  return NextResponse.json({
    ok: true,
    version: out.version,
    fromVersion: currentVersion,
    receipt: out.receipt, // METHODOLOGY_PUBLISHED sha
    head: base.ledger.head ? base.ledger.head.sha : null,
    chainCount: base.ledger.events.length,
    verify,
    summary: out.summary,
    deltas: out.deltas,
    who,
    why: String(why),
    approvals: Array.from(new Set(approvals)),
    publishedAt: new Date().toISOString(),
  });
}
