import { NextResponse } from "next/server";
import { Ledger } from "../../../../lib/ledger.mjs";
import { publishMetrics } from "../../../../lib/metrics/publish.mjs";
import { runPrioritize } from "../../../../lib/store/run.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { result } = await runPrioritize({ capacity: body.capacity ?? 12 });
    const ledger = new Ledger();
    const pub = publishMetrics(result, ledger, { who: body.who, why: body.why });
    return NextResponse.json({ ...pub, verify: ledger.verify() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}