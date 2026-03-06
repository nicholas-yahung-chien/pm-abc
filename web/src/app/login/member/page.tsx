import Link from "next/link";
import { memberSendOtpAction, memberVerifyOtpAction } from "@/app/auth-actions";
import { AuthShell } from "@/components/auth-shell";
import { StatusBanner } from "@/components/status-banner";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);
  const email = pickSearchParam(params.email) ?? "";

  return (
    <AuthShell
      title="Member login"
      description="Enter your email to receive a one-time OTP code."
    >
      <StatusBanner status={status} message={message} />

      <section className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Send OTP</h2>
        <form action={memberSendOtpAction} className="space-y-3">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              autoComplete="email"
            />
          </label>
          <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
            Send OTP
          </button>
        </form>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Verify OTP</h2>
        <form action={memberVerifyOtpAction} className="space-y-3">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              autoComplete="email"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              OTP Code (6 digits)
            </span>
            <input
              name="otpCode"
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-amber-300 hover:bg-amber-50">
            Sign in as member
          </button>
        </form>
      </section>

      <Link href="/login" className="text-sm text-slate-600 underline">
        Back to role selection
      </Link>
    </AuthShell>
  );
}
