import { NextResponse } from "next/server";
import { Ledger } from "../../../../lib/ledger.mjs";
import { submitToIntake, listIntake } from "../../../../lib/jira/intake-backend.mjs";
import { normalizeItem } from "../../../../lib/hierarchy.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const data = await listIntake();
  return NextResponse.json({ ok: true, ...data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const ledger = new Ledger();
    const initiative = normalizeItem(body);
    const result = await submitToIntake(initiative, { ledger });
    return NextResponse.json({
      ok: true,
      ...result,
      verify: ledger.verify(),
      receipts: ledger.events,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}