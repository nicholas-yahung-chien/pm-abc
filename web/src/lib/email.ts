/**
 * Central email sender.
 *
 * DEV_REDIRECT_EMAILS_TO_COACH=true  → redirect all member emails to their
 * group coach instead (development / staging safety switch).
 * Set this env var to "false" (or remove it) before formal launch.
 */
import { Resend } from "resend";

// Lazily initialized — avoids build-time crash when RESEND_API_KEY is absent.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? "");
  }
  return _resend;
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "通知 <noreply@pm-abc.tw>";

export type SendEmailInput = {
  /** The original intended recipient email (always a member's address). */
  recipientEmail: string;
  /**
   * Coach email for this recipient's group — used when dev redirect is active.
   * If undefined and redirect is active, the email is skipped.
   */
  coachEmail?: string;
  subject: string;
  html: string;
};

export type SendEmailResult = {
  deliveredTo: string;
  devRedirected: boolean;
  skipped: boolean;
  error?: string;
};

function isDevRedirectEnabled(): boolean {
  return process.env.DEV_REDIRECT_EMAILS_TO_COACH === "true";
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const redirect = isDevRedirectEnabled();

  let deliveredTo: string;
  if (redirect) {
    if (!input.coachEmail) {
      return { deliveredTo: "", devRedirected: true, skipped: true };
    }
    deliveredTo = input.coachEmail;
  } else {
    deliveredTo = input.recipientEmail;
  }

  try {
    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: deliveredTo,
      subject: redirect
        ? `[代收：${input.recipientEmail}] ${input.subject}`
        : input.subject,
      html: redirect
        ? `<p style="background:#fef3c7;padding:8px 12px;border-radius:4px;font-size:13px;">
            ⚠️ 開發期間代收信件，原收件人：<strong>${input.recipientEmail}</strong>
           </p>${input.html}`
        : input.html,
    });

    if (error) {
      return { deliveredTo, devRedirected: redirect, skipped: false, error: error.message };
    }

    return { deliveredTo, devRedirected: redirect, skipped: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { deliveredTo, devRedirected: redirect, skipped: false, error: message };
  }
}
