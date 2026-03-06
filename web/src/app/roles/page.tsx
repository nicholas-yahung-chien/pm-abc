import { createRoleAction, createRoleAssignmentAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import {
  listGroups,
  listPeople,
  listRoleAssignments,
  listRoles,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RolesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  const [groups, roles, people, assignments] = await Promise.all([
    listGroups(),
    listRoles(),
    listPeople(),
    listRoleAssignments(),
  ]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Phase 2 / 角色管理
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">建立組內角色</h2>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <form action={createRoleAction} className="mt-4 grid gap-3 md:grid-cols-2">
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
            <span className="text-sm font-medium text-slate-700">角色名稱 *</span>
            <input name="name" placeholder="例如：小組長 / 副組長 / 場地長" required />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">排序</span>
            <input name="sortOrder" type="number" defaultValue="100" />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">職責說明</span>
            <textarea name="description" rows={3} />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              建立角色
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">角色分派</h3>
        <form
          action={createRoleAssignmentAction}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">小組 *</span>
            <select name="groupId" required defaultValue="">
              <option value="" disabled>
                請選擇小組
              </option>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">角色 *</span>
            <select name="roleId" required defaultValue="">
              <option value="" disabled>
                請選擇角色
              </option>
              {roles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.group?.code} / {item.name}
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
                  {item.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">備註</span>
            <input name="note" placeholder="例如：代理/輪值" />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
              新增分派
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">角色與分派清單</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">小組</th>
                  <th className="px-3 py-2">角色</th>
                  <th className="px-3 py-2">排序</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      {item.group?.code} {item.group?.name}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2">{item.sort_order}</td>
                  </tr>
                ))}
                {!roles.length && (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={3}>
                      尚無角色定義。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">小組</th>
                  <th className="px-3 py-2">角色</th>
                  <th className="px-3 py-2">人員</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      {item.group?.code} {item.group?.name}
                    </td>
                    <td className="px-3 py-2">{item.role?.name}</td>
                    <td className="px-3 py-2">
                      {item.person?.display_name || item.person?.full_name}
                    </td>
                  </tr>
                ))}
                {!assignments.length && (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={3}>
                      尚無角色分派。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

