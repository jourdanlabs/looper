import { prioritize } from "../../../../lib/engine.mjs";
import { runSpecOnInitiative } from "../../../../lib/spec-run.mjs";
import { INITIATIVES } from "../../../../seed/initiatives.mjs";
import { FUNDING } from "../../../../lib/types.mjs";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const id = (await params).id;
  const initiative = INITIATIVES.find((i) => i.id === id);

  if (!initiative) {
    return Response.json({ error: "Initiative not found", id }, { status: 404 });
  }

  const result = prioritize(INITIATIVES, { capacity: 12 });
  const ranked = result.ranked.find((r) => r.id === id);

  if (!ranked) {
    return Response.json({ error: "Initiative was not intaken", id }, { status: 400 });
  }

  if (ranked._funding !== FUNDING.FUNDED) {
    return Response.json(
      { error: "Only funded initiatives can be specced", id, funding: ranked._funding },
      { status: 403 },
    );
  }

  try {
    const out = runSpecOnInitiative(ranked, result.ledger);
    return Response.json({
      ok: true,
      initiative: {
        id: ranked.id,
        title: ranked.title,
        area: ranked.area,
        sponsor: ranked.sponsor,
        score: ranked._score,
        rank: ranked._rank,
        funding: ranked._funding,
      },
      spec: out.spec,
      verdict: out.verdict,
      engine: "cadmus",
      receipt: out.receipt,
      ledgerReceipt: out.ledgerReceipt,
      head: out.head,
      markdown: out.markdown,
      prompt: out.prompt,
    });
  } catch (err) {
    return Response.json(
      { error: "Spec run failed", message: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}
