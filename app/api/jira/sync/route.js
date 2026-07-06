import { NextResponse } from "next/server";
import { pullInitiativesFromJira } from "../../../../lib/jira/sync.mjs";
import { jiraConfig } from "../../../../lib/jira/config.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const cfg = jiraConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ error: "Jira is not configured" }, { status: 503 });
  }
  try {
    const pulled = await pullInitiativesFromJira(cfg);
    return NextResponse.json(pulled);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}