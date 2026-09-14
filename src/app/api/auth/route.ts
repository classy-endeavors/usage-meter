import { ACCESS_COOKIE, ACCESS_COOKIE_VALUE, expectedAccessCode } from "@/lib/access";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let code = "";

  try {
    const body = (await request.json()) as { code?: string };
    code = String(body.code || "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (code !== expectedAccessCode()) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, ACCESS_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
