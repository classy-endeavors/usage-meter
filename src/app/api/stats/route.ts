import { parseDateRange } from "@/lib/date-range";
import { projectStats, threadStats, userStats } from "@/lib/events";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const range = parseDateRange(new URL(request.url).searchParams);

  try {
    const [projects, threads, users] = await Promise.all([
      projectStats(range),
      threadStats(range),
      userStats(range),
    ]);

    const totals = {
      events: projects.reduce((sum, project) => sum + Number(project.events), 0),
      total_tokens: projects.reduce((sum, project) => sum + Number(project.total_tokens), 0),
      projects: projects.length,
      threads: threads.length,
      users: users.length,
    };

    return NextResponse.json({ totals, projects, threads, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
