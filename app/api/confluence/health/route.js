import { NextResponse } from "next/server";
import { confluenceHealth } from "../../../../lib/confluence/client.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await confluenceHealth());
}