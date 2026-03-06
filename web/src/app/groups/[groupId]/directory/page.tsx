import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listGroups,
  listMemberships,
  listMembershipsByEmail,
  listPeople,
  listRoleAssignments,
} from "@/lib/repository";

type Params = Promise<{ groupId: string }>;

export default async function GroupDirectoryPage({
  params,
}: {
  params: Params;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const message = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${message}`);
  }

  const { groupId } = await params;
  const [groups, memberships, people, assignments, myMemberships] = await Promise.all([
    listGroups(),
    listMemberships(),
    listPeople(),
    listRoleAssignments(),
    session.role === "member" ? listMembershipsByEmail(session.email) : Promise.resolve([]),
  ]);

  if (
    session.role === "member" &&
    !myMemberships.some((membership) => membership.group_id === groupId)
  ) {
    const encoded = encodeURIComponent("學員僅可進入已被指派的小組。");
    redirect(`/groups?status=error&message=${encoded}`);
  }

  const group = groups.find((item) => item.id === groupId);
  if (!group) {
    const encoded = encodeURIComponent("找不到指定小組。");
    redirect(`/groups?status=error&message=${encoded}`);
  }

  const groupMembers = memberships.filter((item) => item.group_id === groupId);
  const personById = new Map(people.map((item) => [item.id, item]));
  const sortedMembers = [...groupMembers].sort((a, b) => {
    if (a.membership_type !== b.membership_type) {
      return a.membership_type === "coach" ? -1 : 1;
    }
    if (a.is_leader !== b.is_leader) {
      return a.is_leader ? -1 : 1;
    }
    const aName = a.person?.display_name || a.person?.full_name || "";
    const bName = b.person?.display_name || b.person?.full_name || "";
    return aName.localeCompare(bName, "zh-Hant");
  });

  const rolesByPerson = new Map<string, string[]>();
  for (const assignment of assignments) {
    if (assignment.group_id !== groupId || !assignment.role?.name) continue;
    const roleNames = rolesByPerson.get(assignment.person_id) ?? [];
    roleNames.push(assignment.role.name);
    rolesByPerson.set(assignment.person_id, roleNames);
  }

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          小組管理 / 通訊錄
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {group.class?.code} / {group.code} {group.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          顯示本小組教練與學員聯絡資訊與 R&R 角色對照。
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href={`/groups/${groupId}`} className="text-amber-700 underline">
            回到小組總覽
          </Link>
          <Link href={`/groups/${groupId}/roles`} className="text-amber-700 underline">
            前往 R&R 管理
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">小組通訊錄</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">姓名</th>
                <th className="px-3 py-2">身份</th>
                <th className="px-3 py-2">角色</th>
                <th className="px-3 py-2">電話</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">LINE ID</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((membership) => {
                const person = personById.get(membership.person_id);
                if (!person || !membership.person) return null;

                const roleNames = rolesByPerson.get(person.id) ?? [];
                const displayRoles = membership.is_leader
                  ? ["小組長", ...roleNames]
                  : roleNames;

                return (
                  <tr key={membership.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium">{person.full_name}</p>
                      <p className="text-xs text-slate-500">{person.display_name || "-"}</p>
                    </td>
                    <td className="px-3 py-2">
                      {membership.membership_type === "coach" ? "教練" : "學員"}
                    </td>
                    <td className="px-3 py-2">
                      {displayRoles.length ? displayRoles.join("、") : "-"}
                    </td>
                    <td className="px-3 py-2">{person.phone || "-"}</td>
                    <td className="px-3 py-2">{person.email || "-"}</td>
                    <td className="px-3 py-2">{person.line_id || "-"}</td>
                  </tr>
                );
              })}
              {!sortedMembers.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    目前此小組尚無成員資料。
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
