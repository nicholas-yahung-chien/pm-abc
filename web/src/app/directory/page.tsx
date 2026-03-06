import { AppShell } from "@/components/app-shell";
import {
  listGroups,
  listMemberships,
  listPeople,
  listRoleAssignments,
  listRoles,
} from "@/lib/repository";

export default async function DirectoryPage() {
  const [groups, people, memberships, roles, assignments] = await Promise.all([
    listGroups(),
    listPeople(),
    listMemberships(),
    listRoles(),
    listRoleAssignments(),
  ]);

  const personById = new Map(people.map((p) => [p.id, p]));
  const rolesByPersonAndGroup = new Map<string, string[]>();

  for (const assignment of assignments) {
    const key = `${assignment.group_id}:${assignment.person_id}`;
    const roleName = assignment.role?.name ?? "";
    if (!roleName) continue;
    const prev = rolesByPersonAndGroup.get(key) ?? [];
    prev.push(roleName);
    rolesByPersonAndGroup.set(key, prev);
  }

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          第二階段 / 通訊錄
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          小組通訊錄與角色對照
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          依小組彙整教練與學員聯絡資訊，並顯示目前 R&R 角色指派。
        </p>
      </section>

      {groups.map((group) => {
        const groupMembers = memberships.filter((m) => m.group_id === group.id);

        return (
          <section
            key={group.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {group.class?.code} / {group.code} {group.name}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{group.description || "-"}</p>

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
                  {groupMembers.map((membership) => {
                    const person = personById.get(membership.person_id);
                    if (!person) return null;

                    const roleKey = `${group.id}:${person.id}`;
                    const roleNames = rolesByPersonAndGroup.get(roleKey) ?? [];
                    const displayRoles = membership.is_leader
                      ? ["小組長", ...roleNames]
                      : roleNames;

                    return (
                      <tr key={membership.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <p className="font-medium">{person.full_name}</p>
                          <p className="text-xs text-slate-500">
                            {person.display_name || "-"}
                          </p>
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
                  {!groupMembers.length && (
                    <tr>
                      <td className="px-3 py-4 text-slate-500" colSpan={6}>
                        此小組尚未指派任何成員。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {!groups.length && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          目前尚無小組資料，請先建立班別與小組。
        </section>
      )}

      {!!roles.length && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          目前已建立角色總數：<strong>{roles.length}</strong>
        </section>
      )}
    </AppShell>
  );
}
