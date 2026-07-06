import { NextResponse } from "next/server";
import { ask } from "../../../../lib/assistant/ask.mjs";
import { runPrioritize } from "../../../../lib/store/run.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const question = body.question;
    if (!question?.trim()) {
      return NextResponse.json({ ok: false, refused: true, reason: "question required" }, { status: 400 });
    }

    const { result } = await runPrioritize({ capacity: body.capacity ?? 12 });
    const answer = ask(question, { engineResult: result });

    return NextResponse.json(answer);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}