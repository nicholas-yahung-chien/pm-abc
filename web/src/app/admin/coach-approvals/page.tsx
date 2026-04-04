import { redirect } from "next/navigation";
import {
  approveCoachAction,
  createCoachByAdminAction,
  deleteCoachByAdminAction,
  rejectCoachAction,
  updateAdminNotificationEmailAction,
} from "@/app/auth-actions";
import { AppShell } from "@/components/app-shell";
import { TableEmptyRow } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getAdminNotificationEmail,
  listCoachAccounts,
  listPendingCoachAccounts,
} from "@/lib/auth/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CoachApprovalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const message = encodeURIComponent("請先登入管理員帳號。");
    redirect(`/login/admin?status=error&message=${message}`);
  }
  if (session.role !== "admin") {
    const message = encodeURIComponent("此頁面僅限管理員使用。");
    redirect(`/dashboard?status=error&message=${message}`);
  }

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  const [pendingResult, allCoachesResult, notificationEmailResult] =
    await Promise.all([
      listPendingCoachAccounts(),
      listCoachAccounts(),
      getAdminNotificationEmail(),
    ]);

  const pendingCoaches = pendingResult.ok ? pendingResult.data : [];
  const coachAccounts = allCoachesResult.ok ? allCoachesResult.data : [];
  const notificationEmail = notificationEmailResult.ok
    ? (notificationEmailResult.data ?? "")
    : "";

  const statusLabel: Record<string, string> = {
    pending: "待審核",
    approved: "已核准",
    rejected: "已拒絕",
  };

  return (
    <AppShell>
      <PageHeader label="管理員" title="教練註冊審核中心" description="管理教練申請、審核狀態與帳號維護。">
        <StatusBanner status={status} message={message} />
      </PageHeader>

      <section className="card-section">
        <h2 className="text-lg font-semibold text-slate-900">管理員通知信箱</h2>
        <form
          action={updateAdminNotificationEmailAction}
          className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"
        >
          <input
            name="notificationEmail"
            type="email"
            required
            defaultValue={notificationEmail}
            placeholder="admin@example.com"
          />
          <button className="btn-primary">
            儲存
          </button>
        </form>
      </section>

      <section className="card-section">
        <h2 className="text-lg font-semibold text-slate-900">待審核申請</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">姓名</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">申請時間</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {pendingCoaches.map((account) => (
                <tr key={account.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{account.display_name || "-"}</td>
                  <td className="px-3 py-2">{account.email}</td>
                  <td className="px-3 py-2">{account.created_at}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <form action={approveCoachAction}>
                        <input type="hidden" name="accountId" value={account.id} />
                        <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                          核准
                        </button>
                      </form>
                      <form action={rejectCoachAction}>
                        <input type="hidden" name="accountId" value={account.id} />
                        <button className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">
                          拒絕
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!pendingCoaches.length && (
                <TableEmptyRow colSpan={4} message="目前沒有待審核教練申請。" />
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-section">
        <h2 className="text-lg font-semibold text-slate-900">手動建立或重設教練帳號</h2>
        <form
          action={createCoachByAdminAction}
          className="mt-3 grid gap-3 md:grid-cols-3"
        >
          <input name="displayName" placeholder="教練顯示名稱" required />
          <input name="email" type="email" placeholder="coach@example.com" required />
          <input name="password" type="password" minLength={8} required />
          <button className="md:col-span-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            儲存教練帳號
          </button>
        </form>
      </section>

      <section className="card-section">
        <h2 className="text-lg font-semibold text-slate-900">教練帳號列表</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">姓名</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">審核狀態</th>
                <th className="px-3 py-2">最後登入</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {coachAccounts.map((account) => (
                <tr key={account.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{account.display_name || "-"}</td>
                  <td className="px-3 py-2">{account.email}</td>
                  <td className="px-3 py-2">
                    {statusLabel[account.coach_status] ?? account.coach_status}
                  </td>
                  <td className="px-3 py-2">{account.last_login_at ?? "-"}</td>
                  <td className="px-3 py-2">
                    <form action={deleteCoachByAdminAction}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <button className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">
                        刪除
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!coachAccounts.length && (
                <TableEmptyRow colSpan={5} message="目前尚無教練帳號。" />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
