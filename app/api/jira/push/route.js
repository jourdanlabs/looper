import { NextResponse } from "next/server";
import { pushRankingsToJira } from "../../../../lib/jira/sync.mjs";
import { loadInitiatives } from "../../../../lib/store/initiatives.mjs";
import { jiraConfig } from "../../../../lib/jira/config.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const cfg = jiraConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ error: "Jira is not configured" }, { status: 503 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }

  try {
    const { initiatives } = await loadInitiatives();
    const out = await pushRankingsToJira(initiatives, { capacity: body.capacity ?? 12 }, cfg);
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}