import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) return Response.json({ error: "Message required" }, { status: 400 });
  if (message.length > 500) {
    return Response.json({ error: "Demo messages are capped at 500 characters." }, { status: 400 });
  }

  const forwardedFor =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "";

  const res = await fetch(`${BACKEND_URL}/ai-public/coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": forwardedFor,
    },
    body: JSON.stringify({ message }),
  });

  const data = await res.json().catch(() => ({ error: "AI service unavailable" }));
  return Response.json(data, { status: res.status });
}
