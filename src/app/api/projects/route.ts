import { parseDateRange } from "@/lib/date-range";
import { projectDetail } from "@/lib/events";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const name = search.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ error: "Missing project name" }, { status: 400 });
  }

  try {
    const threads = await projectDetail(name, parseDateRange(search));
    return NextResponse.json({ project_name: name, threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
