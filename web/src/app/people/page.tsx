import { createPersonAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { listPeople } from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);
  const people = await listPeople();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Phase 2 / 學員與教練
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">建立人員資料</h2>
        <p className="mt-1 text-sm text-slate-600">
          對應通訊錄資料建立與管理（教練/組員）。
        </p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <form action={createPersonAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">學員序號</span>
            <input name="personNo" placeholder="例如：12508" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">姓名 *</span>
            <input name="fullName" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">暱稱</span>
            <input name="displayName" placeholder="希望別人怎麼稱呼" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">人員類型 *</span>
            <select name="personType" defaultValue="member" required>
              <option value="member">member</option>
              <option value="coach">coach</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input type="email" name="email" placeholder="name@example.com" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">電話</span>
            <input name="phone" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">LINE ID</span>
            <input name="lineId" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">自我介紹</span>
            <textarea name="intro" rows={3} />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              建立人員
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">人員清單</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">序號</th>
                <th className="px-3 py-2">姓名</th>
                <th className="px-3 py-2">類型</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">電話</th>
                <th className="px-3 py-2">LINE</th>
              </tr>
            </thead>
            <tbody>
              {people.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.person_no || "-"}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{item.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {item.display_name || "-"}
                    </p>
                  </td>
                  <td className="px-3 py-2">{item.person_type}</td>
                  <td className="px-3 py-2">{item.email || "-"}</td>
                  <td className="px-3 py-2">{item.phone || "-"}</td>
                  <td className="px-3 py-2">{item.line_id || "-"}</td>
                </tr>
              ))}
              {!people.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    尚無人員資料。
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

