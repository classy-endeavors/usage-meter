import { parseDateRange } from "@/lib/date-range";
import { userDetail } from "@/lib/events";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const email = search.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 400 });
  }

  try {
    const threads = await userDetail(email, parseDateRange(search));
    return NextResponse.json({ email, threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
