import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createRoleAction,
  createRoleAssignmentAction,
  deleteRoleAssignmentAction,
  updateRoleAssignmentAction,
  updateRoleDefinitionAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { FormModalTrigger } from "@/components/form-modal-trigger";
import { RoleAssignmentTable } from "@/components/role-assignment-table";
import { RoleDefinitionTable } from "@/components/role-definition-table";
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
          <Link href={`/groups/${groupId}/study`} className="text-amber-700 underline">
            前往讀書會
          </Link>
          <Link href={`/classes/${group.class_id}/courses`} className="text-amber-700 underline">
            查看課程表
          </Link>
        </div>
        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">角色設定與指派</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <FormModalTrigger
            buttonLabel="新增角色"
            modalTitle="新增角色"
            modalDescription="建立小組 R&R 角色，供後續進行成員指派。"
            submitLabel="新增角色"
            action={createRoleAction}
            formClassName="grid gap-3 md:grid-cols-2"
            actionsClassName="md:col-span-2"
          >
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="returnTo" value={returnTo} />

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">角色名稱 *</span>
              <input name="name" placeholder="例如：副組長、場地長、值日生" required />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">角色說明</span>
              <textarea name="description" rows={3} />
            </label>
          </FormModalTrigger>

          <FormModalTrigger
            buttonLabel="新增指派"
            modalTitle="新增角色指派"
            modalDescription="將角色指派給小組學員。"
            submitLabel="新增指派"
            action={createRoleAssignmentAction}
            formClassName="grid gap-3 md:grid-cols-2"
            actionsClassName="md:col-span-2"
            triggerClassName="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
            submitClassName="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
            disabled={!groupRoles.length || !memberOptions.size}
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
          </FormModalTrigger>
        </div>
        {(!groupRoles.length || !memberOptions.size) && (
          <p className="mt-3 text-sm text-slate-600">
            請先建立角色，並確認小組中已有可指派成員。
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">角色列表</h2>
        <RoleDefinitionTable
          groupId={groupId}
          returnTo={returnTo}
          roles={groupRoles.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description || "",
          }))}
          onUpdateAction={updateRoleDefinitionAction}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">角色指派列表</h2>
        <RoleAssignmentTable
          groupId={groupId}
          returnTo={returnTo}
          roles={groupRoles.map((item) => ({ id: item.id, name: item.name }))}
          members={Array.from(memberOptions.values()).map((person) => ({
            id: person.id,
            label: person.displayName || person.fullName,
          }))}
          assignments={groupAssignments.map((item) => ({
            id: item.id,
            roleId: item.role_id,
            roleName: item.role?.name || "",
            personId: item.person_id,
            personLabel: item.person?.display_name || item.person?.full_name || "",
            note: item.note || "",
          }))}
          onUpdateAction={updateRoleAssignmentAction}
          onDeleteAction={deleteRoleAssignmentAction}
        />
      </section>
    </AppShell>
  );
}
