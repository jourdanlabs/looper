import { NextResponse } from "next/server";
import { rescoreAll } from "../../../../lib/ranking.mjs";
import { loadInitiatives } from "../../../../lib/store/initiatives.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { initiatives, meta } = await loadInitiatives();
    const result = rescoreAll(initiatives, {
      capacity: body.capacity ?? 12,
      who: body.who ?? "operator",
      why: body.why ?? "rescore all open backlog",
      dials: body.dials,
    });

    return NextResponse.json({
      ok: true,
      head: result.head,
      verify: result.verify,
      rankingReceipt: result.rankingReceipt,
      ranking: result.ranking,
      stats: result.stats,
      meta,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}