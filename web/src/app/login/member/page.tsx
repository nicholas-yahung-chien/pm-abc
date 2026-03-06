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
      title="學員登入"
      description="請先輸入 Email 取得一次性驗證碼（OTP）。"
    >
      <StatusBanner status={status} message={message} />

      <section className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">寄送驗證碼</h2>
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
            寄送 OTP
          </button>
        </form>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">驗證 OTP</h2>
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
              OTP 驗證碼（6 碼）
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
            以學員身份登入
          </button>
        </form>
      </section>

      <Link href="/login" className="text-sm text-slate-600 underline">
        返回身份選擇
      </Link>
    </AuthShell>
  );
}
