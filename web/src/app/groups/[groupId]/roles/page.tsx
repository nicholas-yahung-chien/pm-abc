import Link from "next/link";
import { redirect } from "next/navigation";
import { createRoleAction, createRoleAssignmentAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listGroups,
  listMemberships,
  listMembershipsByEmail,
  listRoleAssignments,
  listRoles,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type Params = Promise<{ groupId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GroupRolesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const message = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${message}`);
  }

  const { groupId } = await params;
  const query = await searchParams;
  const status = pickSearchParam(query.status);
  const message = pickSearchParam(query.message);

  const [groups, memberships, roles, assignments, myMemberships] = await Promise.all([
    listGroups(),
    listMemberships(),
    listRoles(),
    listRoleAssignments(),
    session.role === "member" ? listMembershipsByEmail(session.email) : Promise.resolve([]),
  ]);

  if (
    session.role === "member" &&
    !myMemberships.some((membership) => membership.group_id === groupId)
  ) {
    const encoded = encodeURIComponent("學員僅可管理已被指派的小組。");
    redirect(`/groups?status=error&message=${encoded}`);
  }

  const group = groups.find((item) => item.id === groupId);
  if (!group) {
    const encoded = encodeURIComponent("找不到指定小組。");
    redirect(`/groups?status=error&message=${encoded}`);
  }

  const groupMemberships = memberships.filter(
    (item) => item.group_id === groupId && item.membership_type === "member",
  );
  const groupRoles = roles.filter((item) => item.group_id === groupId);
  const groupAssignments = assignments.filter((item) => item.group_id === groupId);
  const returnTo = `/groups/${groupId}/roles`;

  const memberOptions = new Map<
    string,
    { id: string; fullName: string; displayName: string }
  >();
  for (const membership of groupMemberships) {
    if (!membership.person) continue;
    memberOptions.set(membership.person.id, {
      id: membership.person.id,
      fullName: membership.person.full_name,
      displayName: membership.person.display_name,
    });
  }

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          小組管理 / R&R
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {group.class?.code} / {group.code} {group.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href={`/groups/${groupId}`} className="text-amber-700 underline">
            回到小組總覽
          </Link>
          <Link href={`/groups/${groupId}/directory`} className="text-amber-700 underline">
            前往通訊錄
          </Link>
        </div>
        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">建立角色</h2>
        <form action={createRoleAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">角色名稱 *</span>
            <input name="name" placeholder="例如：副組長、場地長、值日生" required />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">排序</span>
            <input name="sortOrder" type="number" defaultValue="100" />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">角色說明</span>
            <textarea name="description" rows={3} />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              新增角色
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">角色指派</h2>
        <form
          action={createRoleAssignmentAction}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">角色 *</span>
            <select name="roleId" required defaultValue="">
              <option value="" disabled>
                請選擇角色
              </option>
              {groupRoles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">學員 *</span>
            <select name="personId" required defaultValue="">
              <option value="" disabled>
                請選擇學員
              </option>
              {Array.from(memberOptions.values()).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName || person.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">備註</span>
            <input name="note" placeholder="例如：本期負責第一章導讀" />
          </label>

          <div className="md:col-span-2">
            <button
              disabled={!groupRoles.length || !memberOptions.size}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              新增指派
            </button>
          </div>
        </form>
        {(!groupRoles.length || !memberOptions.size) && (
          <p className="mt-3 text-sm text-slate-600">
            請先建立角色，並確認小組中已有可指派成員。
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">角色與指派列表</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">角色</th>
                  <th className="px-3 py-2">排序</th>
                  <th className="px-3 py-2">說明</th>
                </tr>
              </thead>
              <tbody>
                {groupRoles.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2">{item.sort_order}</td>
                    <td className="px-3 py-2">{item.description || "-"}</td>
                  </tr>
                ))}
                {!groupRoles.length && (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={3}>
                      目前尚無角色資料。
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
                  <th className="px-3 py-2">角色</th>
                  <th className="px-3 py-2">學員</th>
                  <th className="px-3 py-2">備註</th>
                </tr>
              </thead>
              <tbody>
                {groupAssignments.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.role?.name || "-"}</td>
                    <td className="px-3 py-2">
                      {item.person?.display_name || item.person?.full_name || "-"}
                    </td>
                    <td className="px-3 py-2">{item.note || "-"}</td>
                  </tr>
                ))}
                {!groupAssignments.length && (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={3}>
                      目前尚無角色指派資料。
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
