// /dials/preview — SANDBOX route handler. POST proposed dials, get back the
// live before/after rank under the engine's preview() — NO ledger write.
//
// This is the instrument behind the Strategic-Lever Deficit fix: a committee
// member drags a dial and sees exactly what re-ranks, privately, before
// anything is committed. The client board calls this on every dial change.
//
// Server-only: preview() → rankUnder() → scoreInitiative() etc. The engine is
// pure here (no node:crypto touched on the sandbox path), but we keep it on the
// server so the UI agents never import the engine into client code.

import { NextResponse } from "next/server";
import { preview } from "../../../lib/methodology.mjs";
import { loadInitiatives } from "../../../lib/store/initiatives.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { currentDials = {}, proposedDials = {}, capacity = 12 } = body || {};
  const { initiatives } = await loadInitiatives();

  const result = preview(initiatives, {
    currentDials,
    proposedDials,
    capacity,
  });

  return NextResponse.json(result);
}
