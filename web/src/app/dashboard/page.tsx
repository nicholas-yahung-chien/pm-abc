import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const message = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${message}`);
  }

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  const roleLabel =
    session.role === "admin" ? "管理員" : session.role === "coach" ? "教練" : "學員";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              PM-ABC
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              歡迎回來，{session.displayName || session.email}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              目前登入身份：<strong>{roleLabel}</strong>（{session.email}）
            </p>
          </div>

          <form action={logoutAction}>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700">
              登出
            </button>
          </form>
        </div>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">操作指引</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>請從左側選單進入班別、小組、人員與角色管理。</li>
          <li>管理員可額外進入「教練審核中心」。</li>
          <li>若要切換身份，請先登出後再以對應入口登入。</li>
        </ul>
      </section>
    </main>
  );
}
