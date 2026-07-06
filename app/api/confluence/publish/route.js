import { NextResponse } from "next/server";
import { confluencePublishMarkdown } from "../../../../lib/confluence/client.mjs";
import { confluenceConfig } from "../../../../lib/confluence/config.mjs";
import { runPrioritize } from "../../../../lib/store/run.mjs";
import { renderBrief } from "../../../../lib/brief.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const cfg = confluenceConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ error: "Confluence is not configured" }, { status: 503 });
  }

  let title = `LOOPER — Cabinet Readout ${new Date().toISOString().slice(0, 10)}`;
  try {
    const body = await req.json();
    if (body?.title) title = body.title;
  } catch {
    /* default title */
  }

  try {
    const { result } = await runPrioritize({ capacity: 12 });
    const markdown = renderBrief(result);
    const page = await confluencePublishMarkdown(title, markdown, cfg);
    return NextResponse.json({
      ok: true,
      pageId: page.id,
      title: page.title,
      url: `${cfg.site}/wiki/spaces/${cfg.spaceKey}/pages/${page.id}`,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}