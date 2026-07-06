import { NextResponse } from "next/server";
import { jiraHealth } from "../../../../lib/jira/client.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const health = await jiraHealth();
  return NextResponse.json(health);
}