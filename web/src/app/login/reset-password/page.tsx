import Link from "next/link";
import { requestPasswordResetAction } from "@/app/auth-actions";
import { AuthShell } from "@/components/auth-shell";
import { StatusBanner } from "@/components/status-banner";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  return (
    <AuthShell
      title="重設密碼"
      description="輸入您的帳號 Email，系統將寄送重設連結至您的信箱。"
    >
      <StatusBanner status={status} message={message} />

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <h2 className="text-base font-semibold text-slate-900">申請密碼重設</h2>
        <form action={requestPasswordResetAction} className="space-y-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Email（管理員請輸入 root）
            </span>
            <input name="email" type="text" autoComplete="email" required />
          </label>
          <div className="pt-2">
            <button className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700">
              寄送重設連結
            </button>
          </div>
        </form>
      </section>

      <p className="text-sm text-slate-500">
        學員帳號使用 OTP 驗證碼登入，無需重設密碼。
      </p>

      <Link href="/login" className="text-sm text-slate-600 underline">
        返回身份選擇
      </Link>
    </AuthShell>
  );
}
