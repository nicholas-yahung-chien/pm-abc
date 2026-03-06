import { createClassAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { listClasses } from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);
  const classes = await listClasses();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Phase 2 / 班別管理
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">建立新班別</h2>
        <p className="mt-1 text-sm text-slate-600">
          對應 Excel 的「班別建立：開啟一份全新的管理」。
        </p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <form action={createClassAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">班別代碼 *</span>
            <input name="code" placeholder="例如：PMP北201" required />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">班別名稱 *</span>
            <input name="name" placeholder="例如：PMP北區第201班" required />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">開始日期</span>
            <input type="date" name="startDate" />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">結束日期</span>
            <input type="date" name="endDate" />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">描述</span>
            <textarea
              name="description"
              rows={3}
              placeholder="課程批次說明、備註"
            />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              建立班別
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">班別清單</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">代碼</th>
                <th className="px-3 py-2">名稱</th>
                <th className="px-3 py-2">開始</th>
                <th className="px-3 py-2">結束</th>
                <th className="px-3 py-2">描述</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">
                    {item.code}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {item.start_date ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {item.end_date ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {item.description || "-"}
                  </td>
                </tr>
              ))}
              {!classes.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={5}>
                    尚無資料。先建立第一個班別。
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

