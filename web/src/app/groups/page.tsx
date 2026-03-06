import { createGroupAction, createMembershipAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import {
  listClasses,
  listGroups,
  listMemberships,
  listPeople,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  const [classes, groups, people, memberships] = await Promise.all([
    listClasses(),
    listGroups(),
    listPeople(),
    listMemberships(),
  ]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Phase 2 / 小組管理
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">建立小組</h2>
        <p className="mt-1 text-sm text-slate-600">
          對應 Excel 的小組基本資料建立與管理。
        </p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <form action={createGroupAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">班別 *</span>
            <select name="classId" required defaultValue="">
              <option value="" disabled>
                請選擇班別
              </option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} / {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">小組代碼 *</span>
            <input name="code" placeholder="例如：G1" required />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">小組名稱 *</span>
            <input name="name" placeholder="例如：明天會更好" required />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">描述</span>
            <textarea name="description" rows={3} placeholder="小組說明、備註" />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              建立小組
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">加入小組成員</h3>
        <form
          action={createMembershipAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">小組 *</span>
            <select name="groupId" required defaultValue="">
              <option value="" disabled>
                請選擇小組
              </option>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class?.code ?? "N/A"} / {item.code} {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">人員 *</span>
            <select name="personId" required defaultValue="">
              <option value="" disabled>
                請選擇人員
              </option>
              {people.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name} ({item.person_type})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">類型 *</span>
            <select name="membershipType" required defaultValue="member">
              <option value="member">member</option>
              <option value="coach">coach</option>
            </select>
          </label>

          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <input type="checkbox" name="isLeader" className="h-4 w-4" />
            小組長
          </label>

          <div className="md:col-span-4">
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
              新增成員
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">小組清單</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">班別</th>
                <th className="px-3 py-2">小組代碼</th>
                <th className="px-3 py-2">小組名稱</th>
                <th className="px-3 py-2">描述</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{item.class?.code ?? "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2">{item.description || "-"}</td>
                </tr>
              ))}
              {!groups.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    尚無小組，請先建立班別與小組。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">小組成員清單</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">小組</th>
                <th className="px-3 py-2">成員</th>
                <th className="px-3 py-2">類型</th>
                <th className="px-3 py-2">組長</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {item.group?.code} {item.group?.name}
                  </td>
                  <td className="px-3 py-2">
                    {item.person?.display_name || item.person?.full_name || "-"}
                  </td>
                  <td className="px-3 py-2">{item.membership_type}</td>
                  <td className="px-3 py-2">{item.is_leader ? "是" : "否"}</td>
                </tr>
              ))}
              {!memberships.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    尚無成員分派。
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

