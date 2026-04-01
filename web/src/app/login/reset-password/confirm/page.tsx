import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPasswordWithTokenAction } from "@/app/auth-actions";
import { AuthShell } from "@/components/auth-shell";
import { StatusBanner } from "@/components/status-banner";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = pickSearchParam(params.token);
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  if (!token) {
    redirect(
      "/login/reset-password?status=error&message=" +
        encodeURIComponent("重設連結無效，請重新申請。"),
    );
  }

  return (
    <AuthShell title="設定新密碼" description="請輸入您的新密碼（至少 8 碼）。">
      <StatusBanner status={status} message={message} />

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <h2 className="text-base font-semibold text-slate-900">設定新密碼</h2>
        <form action={resetPasswordWithTokenAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">新密碼</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">確認新密碼</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <div className="pt-2">
            <button className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700">
              確認重設密碼
            </button>
          </div>
        </form>
      </section>

      <Link
        href="/login/reset-password"
        className="text-sm text-slate-600 underline"
      >
        重新申請重設連結
      </Link>
    </AuthShell>
  );
}
