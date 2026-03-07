import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";
import {
  assignGroupCoachOwnerAction,
  createGroupAction,
  createMembershipAction,
  updateGroupDescriptionAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { GroupMembershipList } from "@/components/group-membership-list";
import { GroupManagementTable } from "@/components/group-management-table";
import { StatusBanner } from "@/components/status-banner";
import { TextPreviewDialogButton } from "@/components/text-preview-dialog-button";
import { getCurrentSession } from "@/lib/auth/session";
import { listCoachAccounts } from "@/lib/auth/repository";
import {
  listClasses,
  listGroupCoachOwners,
  listGroups,
  listMembers,
  listMemberships,
  listMembershipsByEmail,
  listRoleAssignments,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const encoded = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${encoded}`);
  }

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  if (session.role === "member") {
    const [allGroups, memberMemberships] = await Promise.all([
      listGroups(),
      listMembershipsByEmail(session.email),
    ]);

    const memberGroupIds = new Set(memberMemberships.map((item) => item.group_id));
    const groups = allGroups.filter((item) => memberGroupIds.has(item.id));

    return (
      <AppShell>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            第二階段 / 我的小組
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">我的小組列表</h2>
          <p className="mt-1 text-sm text-slate-600">
            學員僅可進入已被指派的小組，並在小組內進行管理與協作。
          </p>

          <div className="mt-4">
            <StatusBanner status={status} message={message} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">小組列表</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">班別</th>
                  <th className="px-3 py-2">小組代碼</th>
                  <th className="px-3 py-2">小組名稱</th>
                  <th className="px-3 py-2">說明</th>
                  <th className="px-3 py-2">入口</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.class?.code ?? "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2">
                      <TextPreviewDialogButton
                        title={`小組說明：${item.code} ${item.name}`}
                        text={item.description || ""}
                        placeholder="查看小組說明"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/groups/${item.id}`}
                        title="進入小組"
                        className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100"
                      >
                        <ArrowRightCircle className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!groups.length && (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={5}>
                      目前尚未被指派到任何小組。
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

  const [classes, groups, members, memberships, roleAssignments, coachAccountsResult, coachOwners] =
    await Promise.all([
      listClasses(),
      listGroups(),
      listMembers(),
      listMemberships(),
      listRoleAssignments(),
      listCoachAccounts(),
      listGroupCoachOwners(),
    ]);

  const approvedCoaches = coachAccountsResult.ok
    ? coachAccountsResult.data.filter(
        (item) => item.coach_status === "approved" && item.is_active,
      )
    : [];

  const ownerByGroupId = new Map(
    coachOwners.map((item) => [item.group_id, item.coach_account_id]),
  );

  const roleNamesByGroupPerson = new Map<string, string[]>();
  for (const assignment of roleAssignments) {
    if (!assignment.role?.name) continue;
    const key = `${assignment.group_id}:${assignment.person_id}`;
    const list = roleNamesByGroupPerson.get(key) ?? [];
    list.push(assignment.role.name);
    roleNamesByGroupPerson.set(key, list);
  }

  const memberMemberships = memberships.filter(
    (item) => item.membership_type === "member",
  );

  const groupOptions = groups.map((item) => ({
    id: item.id,
    label: `${item.class?.code ?? "-"} / ${item.code} ${item.name}`,
  }));

  const memberMembershipRows = memberMemberships.map((item) => {
    const key = `${item.group_id}:${item.person_id}`;
    const roleNames = roleNamesByGroupPerson.get(key) ?? [];

    return {
      id: item.id,
      groupId: item.group_id,
      groupLabel: `${item.group?.code ?? "-"} ${item.group?.name ?? ""}`.trim(),
      memberLabel: item.person?.display_name || item.person?.full_name || "-",
      membershipTypeLabel: "學員",
      roleLabel: roleNames.length ? roleNames.join("、") : "-",
    };
  });

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          第二階段 / 小組管理
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">建立小組</h2>
        <p className="mt-1 text-sm text-slate-600">
          在班別底下建立小組，並由小組入口進行組內功能管理。
        </p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <form action={createGroupAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">所屬班別 *</span>
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
            <input name="name" placeholder="例如：共好學習組" required />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">說明</span>
            <textarea name="description" rows={3} placeholder="小組補充資訊" />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              新增小組
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">小組成員指派</h3>
        <form action={createMembershipAction} className="mt-4 grid gap-3 md:grid-cols-3">
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
            <span className="text-sm font-medium text-slate-700">學員 *</span>
            <select name="personId" required defaultValue="">
              <option value="" disabled>
                請選擇學員
              </option>
              {members.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
          </label>

          <div className="md:self-end">
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
              新增成員指派
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">小組列表</h3>
        <GroupManagementTable
          groups={groups.map((item) => ({
            id: item.id,
            classCode: item.class?.code ?? "-",
            code: item.code,
            name: item.name,
            description: item.description || "",
            ownerCoachAccountId: ownerByGroupId.get(item.id) ?? "",
          }))}
          coaches={approvedCoaches.map((item) => ({
            id: item.id,
            displayName: item.display_name || item.email,
            email: item.email,
          }))}
          onAssignCoachAction={assignGroupCoachOwnerAction}
          onUpdateDescriptionAction={updateGroupDescriptionAction}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">小組成員列表</h3>
        <GroupMembershipList groups={groupOptions} rows={memberMembershipRows} />
      </section>
    </AppShell>
  );
}
