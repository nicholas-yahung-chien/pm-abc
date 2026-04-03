import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import { listNotificationLogs } from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";
import type { NotificationLogRow, NotificationStatus, NotificationType } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TYPE_LABELS: Record<NotificationType, string> = {
  tracking_due_reminder: "追蹤到期",
  study_session_reminder_1day: "讀書會 T-1天",
  study_session_reminder_2hour: "讀書會 T-2小時",
  group_email_blast: "群發信",
};

const STATUS_LABELS: Record<NotificationStatus, string> = {
  pending: "處理中",
  sent: "已送出",
  failed: "失敗",
  skipped: "略過",
};

const STATUS_CLASSES: Record<NotificationStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  sent: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border border-rose-200",
  skipped: "bg-slate-100 text-slate-500 border border-slate-200",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const ymd = d.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
  const hm = d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${ymd} ${hm}`;
}

export default async function NotificationsPage({
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
  const filterStatus = pickSearchParam(params.filter_status) as NotificationStatus | null;
  const filterType = pickSearchParam(params.filter_type) as NotificationType | null;

  const allLogs = await listNotificationLogs(500);

  const logs = allLogs.filter((log) => {
    if (filterStatus && log.status !== filterStatus) return false;
    if (filterType && log.notification_type !== filterType) return false;
    return true;
  });

  const counts = allLogs.reduce(
    (acc, log) => {
      acc[log.status] = (acc[log.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          管理員
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">通知記錄</h1>
        <p className="mt-1 text-sm text-slate-600">
          查看所有系統自動發送的通知信件狀態與明細。
        </p>
        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      {/* Summary counters */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["sent", "failed", "skipped", "pending"] as NotificationStatus[]).map((s) => (
          <div
            key={s}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500">{STATUS_LABELS[s]}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts[s] ?? 0}</p>
          </div>
        ))}
      </section>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">狀態篩選</label>
            <select
              name="filter_status"
              defaultValue={filterStatus ?? ""}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">全部</option>
              {(Object.keys(STATUS_LABELS) as NotificationStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">類型篩選</label>
            <select
              name="filter_type"
              defaultValue={filterType ?? ""}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">全部</option>
              {(Object.keys(TYPE_LABELS) as NotificationType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
          >
            套用
          </button>
          <a
            href="/admin/notifications"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            清除
          </a>
        </form>
      </section>

      {/* Log table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            通知明細
            <span className="ml-2 text-xs font-normal text-slate-500">
              共 {logs.length} 筆{allLogs.length > logs.length ? `（篩選自 ${allLogs.length} 筆）` : ""}
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <th className="px-4 py-2 whitespace-nowrap">時間</th>
                <th className="px-4 py-2 whitespace-nowrap">類型</th>
                <th className="px-4 py-2 whitespace-nowrap">狀態</th>
                <th className="px-4 py-2 whitespace-nowrap">原收件人</th>
                <th className="px-4 py-2 whitespace-nowrap">實際送達</th>
                <th className="px-4 py-2 whitespace-nowrap">代收</th>
                <th className="px-4 py-2 whitespace-nowrap">主旨</th>
                <th className="px-4 py-2 whitespace-nowrap">錯誤原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                    目前尚無通知記錄。
                  </td>
                </tr>
              ) : (
                logs.map((log: NotificationLogRow) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-xs text-slate-700">
                        {TYPE_LABELS[log.notification_type]}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[log.status]}`}>
                        {STATUS_LABELS[log.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600 whitespace-nowrap">
                      {log.recipient_email}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600 whitespace-nowrap">
                      {log.delivered_to_email}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {log.dev_redirected ? (
                        <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                          代收
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600 max-w-[240px] truncate">
                      {log.subject}
                    </td>
                    <td className="px-4 py-2 text-xs text-rose-600 max-w-[200px] truncate">
                      {log.error_message ?? ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
