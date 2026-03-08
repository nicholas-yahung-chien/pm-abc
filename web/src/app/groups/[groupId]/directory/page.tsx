import Link from "next/link";
import { redirect } from "next/navigation";
import { updateGroupMemberDirectoryProfileAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { GroupDirectoryMemberTable } from "@/components/group-directory-member-table";
import { StatusBanner } from "@/components/status-banner";
import { TextPreviewDialogButton } from "@/components/text-preview-dialog-button";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listGroupCoachOwners,
  listGroups,
  listMemberships,
  listMembershipsByEmail,
  listPeople,
  listRoleAssignments,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type Params = Promise<{ groupId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GroupDirectoryPage({
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
  const paramValues = await searchParams;
  const status = pickSearchParam(paramValues.status);
  const message = pickSearchParam(paramValues.message);

  const [groups, memberships, people, assignments, myMemberships, coachOwners] =
    await Promise.all([
      listGroups(),
      listMemberships(),
      listPeople(),
      listRoleAssignments(),
      session.role === "member"
        ? listMembershipsByEmail(session.email)
        : Promise.resolve([]),
      listGroupCoachOwners(),
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

  const coachOwner = coachOwners.find((item) => item.group_id === groupId);
  const coachPerson = people.find(
    (item) =>
      item.person_type === "coach" &&
      item.email?.toLowerCase() === coachOwner?.coach?.email?.toLowerCase(),
  );

  const groupMembers = memberships.filter(
    (item) => item.group_id === groupId && item.membership_type === "member",
  );
  const personById = new Map(people.map((item) => [item.id, item]));
  const sortedMembers = [...groupMembers].sort((a, b) => {
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

  const memberItems = sortedMembers
    .map((membership) => {
      const person = personById.get(membership.person_id);
      if (!person || !membership.person) return null;

      return {
        personId: person.id,
        personNo: person.person_no || "",
        fullName: person.full_name || "",
        displayName: person.display_name || "",
        rolesLabel: (rolesByPerson.get(person.id) ?? []).join("、"),
        email: person.email || "",
        lineId: person.line_id || "",
        intro: person.intro || "",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

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
          教練資訊顯示於頂端，學員資料可於下方列表直接編輯。
        </p>
        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href={`/groups/${groupId}`} className="text-amber-700 underline">
            回到小組總覽
          </Link>
          <Link href={`/groups/${groupId}/roles`} className="text-amber-700 underline">
            前往 R&amp;R 管理
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">小組教練資訊</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">姓名</th>
                <th className="px-3 py-2">希望別人怎麼稱呼</th>
                <th className="px-3 py-2">身份</th>
                <th className="px-3 py-2">角色</th>
                <th className="px-3 py-2">電話</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">LINE ID</th>
                <th className="px-3 py-2">自我介紹</th>
              </tr>
            </thead>
            <tbody>
              {coachOwner?.coach && (
                <tr className="border-t border-slate-100 bg-amber-50/30">
                  <td className="px-3 py-2">
                    {coachPerson?.full_name || coachOwner.coach.display_name || "-"}
                  </td>
                  <td className="px-3 py-2">
                    {coachPerson?.display_name || coachOwner.coach.display_name || "-"}
                  </td>
                  <td className="px-3 py-2">教練</td>
                  <td className="px-3 py-2">小組教練</td>
                  <td className="px-3 py-2">{coachPerson?.phone || "-"}</td>
                  <td className="px-3 py-2">{coachOwner.coach.email || "-"}</td>
                  <td className="px-3 py-2">{coachPerson?.line_id || "-"}</td>
                  <td className="px-3 py-2">
                    <TextPreviewDialogButton
                      title="教練自我介紹"
                      text={coachPerson?.intro || ""}
                      placeholder="查看教練自我介紹"
                    />
                  </td>
                </tr>
              )}
              {!coachOwner?.coach && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={8}>
                    目前尚未指派小組教練。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">小組學員通訊錄</h2>
        <p className="mt-1 text-sm text-slate-600">
          可直接編輯「希望別人怎麼稱呼」、「LINE ID」與「自我介紹」。
        </p>
        <GroupDirectoryMemberTable
          groupId={groupId}
          members={memberItems}
          onUpdateAction={updateGroupMemberDirectoryProfileAction}
        />
      </section>
    </AppShell>
  );
}
