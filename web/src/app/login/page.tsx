import Link from "next/link";
import { StatusBanner } from "@/components/status-banner";
import { AuthShell } from "@/components/auth-shell";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  return (
    <AuthShell
      title="登入 PM-ABC 平台"
      description="請選擇您的身份進行登入。"
    >
      <StatusBanner status={status} message={message} />
      <div className="grid gap-3">
        <Link
          href="/login/coach"
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
        >
          教練登入 / 註冊
        </Link>
        <Link
          href="/login/member"
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
        >
          學員登入（Email OTP）
        </Link>
        <Link
          href="/login/admin"
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
        >
          管理員登入
        </Link>
      </div>
    </AuthShell>
  );
}
