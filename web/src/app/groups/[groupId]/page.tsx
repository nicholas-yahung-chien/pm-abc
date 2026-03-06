import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listGroups,
  listMemberships,
  listMembershipsByEmail,
  listRoleAssignments,
  listRoles,
} from "@/lib/repository";

type Params = Promise<{ groupId: string }>;

export default async function GroupDetailPage({
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
    const message = encodeURIComponent("學員僅可進入已被指派的小組。");
    redirect(`/groups?status=error&message=${message}`);
  }

  const group = groups.find((item) => item.id === groupId);
  if (!group) {
    const message = encodeURIComponent("找不到指定小組。");
    redirect(`/groups?status=error&message=${message}`);
  }

  const groupMembers = memberships.filter((item) => item.group_id === groupId);
  const groupRoles = roles.filter((item) => item.group_id === groupId);
  const groupAssignments = assignments.filter((item) => item.group_id === groupId);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          小組管理 / 小組總覽
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {group.class?.code} / {group.code} {group.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{group.description || "-"}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">小組成員數</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{groupMembers.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">R&R 角色數</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{groupRoles.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">角色指派數</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{groupAssignments.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/groups/${groupId}/roles`}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">R&R 角色管理</h2>
          <p className="mt-1 text-sm text-slate-600">
            建立角色定義並指派給小組成員。
          </p>
        </Link>

        <Link
          href={`/groups/${groupId}/directory`}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
        >
          <h2 className="text-lg font-semibold text-slate-900">通訊錄</h2>
          <p className="mt-1 text-sm text-slate-600">查看本小組教練與學員聯絡資訊。</p>
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/groups" className="text-sm font-semibold text-amber-700 underline">
          回到小組列表
        </Link>
      </section>
    </AppShell>
  );
}
