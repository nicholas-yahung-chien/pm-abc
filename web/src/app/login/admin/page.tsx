import Link from "next/link";
import { adminLoginAction } from "@/app/auth-actions";
import { AuthShell } from "@/components/auth-shell";
import { StatusBanner } from "@/components/status-banner";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  return (
    <AuthShell
      title="管理員登入"
      description="首次預設帳號密碼為：root / root"
    >
      <StatusBanner status={status} message={message} />

      <form action={adminLoginAction} className="space-y-3">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">帳號</span>
          <input name="username" defaultValue="root" required />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">密碼</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
          以管理員身份登入
        </button>
      </form>

      <Link href="/login" className="text-sm text-slate-600 underline">
        返回身份選擇
      </Link>
    </AuthShell>
  );
}
