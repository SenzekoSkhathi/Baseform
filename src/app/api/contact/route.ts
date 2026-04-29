import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/sender";

const TO = process.env.CONTACT_INBOX ?? "info@baseformapplications.com";

const ROLE_OPTIONS = ["learner", "parent", "teacher", "school_ngo", "other"] as const;
const HELP_OPTIONS = [
  "bulk_school_licence",
  "ngo_partnership",
  "press",
  "personal_help",
  "bug",
  "other",
] as const;

type Role = (typeof ROLE_OPTIONS)[number];
type Help = (typeof HELP_OPTIONS)[number];

type ContactPayload = {
  name?: unknown;
  surname?: unknown;
  email?: unknown;
  cell?: unknown;
  school?: unknown;
  role?: unknown;
  help?: unknown;
  message?: unknown;
};

function asString(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ContactPayload;

    const name = asString(body.name, 80);
    const surname = asString(body.surname, 80);
    const email = asString(body.email, 200);
    const cell = asString(body.cell, 40);
    const school = asString(body.school, 200);
    const role = asString(body.role, 40) as Role;
    const help = asString(body.help, 40) as Help;
    const message = asString(body.message, 4000);

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email and message are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    if (role && !ROLE_OPTIONS.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (help && !HELP_OPTIONS.includes(help)) {
      return NextResponse.json({ error: "Invalid help selection." }, { status: 400 });
    }

    const subject = `Baseform contact · ${name} ${surname || ""}`.trim();
    const html = `
      <h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)} ${escapeHtml(surname)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Cell:</strong> ${escapeHtml(cell || "—")}</p>
      <p><strong>School:</strong> ${escapeHtml(school || "—")}</p>
      <p><strong>Who:</strong> ${escapeHtml(role || "—")}</p>
      <p><strong>How:</strong> ${escapeHtml(help || "—")}</p>
      <hr />
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    `;

    const status = await sendEmail({ to: TO, subject, html });

    return NextResponse.json({ ok: true, sent: status === "sent" });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Could not send your message. Try again in a moment." },
      { status: 500 }
    );
  }
}
