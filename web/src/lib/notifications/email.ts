type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!apiKey) {
    return { ok: false, message: "RESEND_API_KEY is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      message: `Resend API error: ${response.status} ${errorText}`,
    };
  }

  return { ok: true };
}
