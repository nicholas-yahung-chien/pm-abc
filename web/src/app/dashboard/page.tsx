import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
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
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">操作指引</h2>
        {session.role === "member" ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>請從左側「我的小組」進入你被指派的小組。</li>
            <li>學員不可管理班別、小組建立與學員帳號。</li>
            <li>R&R 與通訊錄請先進入單一小組後操作。</li>
            <li>帳號資訊請至「帳號設定」頁面。</li>
          </ul>
        ) : (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>請從左側選單進入班別、小組與學員管理。</li>
            <li>R&R 與通訊錄請先進入「小組管理」後，再從單一小組操作。</li>
            <li>管理員可由左側選單進入「教練審核中心」。</li>
            <li>帳號資訊與密碼設定請至「帳號設定」頁面。</li>
          </ul>
        )}
      </section>
    </AppShell>
  );
}
