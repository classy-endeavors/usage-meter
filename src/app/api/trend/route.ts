import { parseDateRange } from "@/lib/date-range";
import { dailyTrend } from "@/lib/events";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const project = search.get("project")?.trim() || undefined;
  const user = search.get("user")?.trim() || undefined;

  try {
    const points = await dailyTrend(parseDateRange(search), { project, user });
    return NextResponse.json({ points });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load trend";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
