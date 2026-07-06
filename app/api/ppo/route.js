import { NextResponse } from "next/server";
import { Ledger } from "../../../lib/ledger.mjs";
import { submitRequest, approveRequest, listRequests, PPO_REQUEST_TYPES } from "../../../lib/ppo/store.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    types: PPO_REQUEST_TYPES,
    requests: listRequests(),
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const ledger = new Ledger();
    const item = submitRequest(body, { ledger });
    return NextResponse.json({
      ok: true,
      item,
      verify: ledger.verify(),
      receipt: ledger.head?.sha,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const ledger = new Ledger();
    const item = approveRequest(body.id, { approver: body.approver ?? "committee", ledger });
    return NextResponse.json({
      ok: true,
      item,
      verify: ledger.verify(),
      receipt: ledger.head?.sha,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}