const FROM = process.env.EMAIL_FROM ?? "Baseform Inc. <noreply@baseformapplications.com>";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(input: SendEmailInput): Promise<"sent" | "skipped"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email/sender] RESEND_API_KEY is missing; skipping email send");
    return "skipped";
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }

  return "sent";
}
