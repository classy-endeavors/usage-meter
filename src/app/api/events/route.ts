import { listEvents, upsertEvent } from "@/lib/events";
import type { UsageEventInput } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await listEvents(50);
    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: UsageEventInput;

  try {
    body = (await request.json()) as UsageEventInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const id = await upsertEvent(body);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
