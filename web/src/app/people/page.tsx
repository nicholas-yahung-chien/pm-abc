import {
  createMemberAccountAction,
  deleteMemberAccountAction,
  updateMemberAccountAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { listMembers } from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);
  const members = await listMembers();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          第二階段 / 學員管理
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">新增學員帳號</h2>
        <p className="mt-1 text-sm text-slate-600">
          此頁只管理學員帳號與編號。通訊錄中的姓名、LINE ID、稱呼、自我介紹由學員在小組通訊錄自行編輯。
        </p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <form
          action={createMemberAccountAction}
          className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
        >
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">學員 Email *</span>
            <input
              name="email"
              type="email"
              placeholder="member@example.com"
              required
            />
          </label>

          <div className="md:self-end">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              新增學員帳號
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">學員管理清單</h3>
        <p className="mt-1 text-sm text-slate-600">
          可修改學員 Email、設定學員編號，或刪除學員。新增完成後即可到小組管理進行成員指派。
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">學員編號</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">建立時間</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{item.person_no || "-"}</td>
                  <td className="px-3 py-2">{item.email || "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(item.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-end gap-2">
                      <form action={updateMemberAccountAction} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="personId" value={item.id} />
                        <label className="space-y-1">
                          <span className="block text-xs text-slate-600">編號</span>
                          <input
                            name="personNo"
                            defaultValue={item.person_no || ""}
                            placeholder="例如 2508"
                            className="min-w-24"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="block text-xs text-slate-600">Email</span>
                          <input
                            name="email"
                            type="email"
                            defaultValue={item.email || ""}
                            required
                            className="min-w-52"
                          />
                        </label>
                        <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                          儲存
                        </button>
                      </form>
                      <form action={deleteMemberAccountAction}>
                        <input type="hidden" name="personId" value={item.id} />
                        <button className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">
                          刪除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!members.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    目前尚無學員帳號。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
