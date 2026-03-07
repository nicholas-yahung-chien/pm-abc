import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GroupQuickEntry } from "@/components/group-quick-entry";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listGroupCoachOwners,
  listGroups,
  listMembershipsByEmail,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const message = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${message}`);
  }

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  const [groups, coachOwners, memberMemberships] = await Promise.all([
    listGroups(),
    session.role === "coach" ? listGroupCoachOwners() : Promise.resolve([]),
    session.role === "member" ? listMembershipsByEmail(session.email) : Promise.resolve([]),
  ]);

  const accessibleGroupIds = new Set<string>();
  if (session.role === "admin") {
    for (const group of groups) {
      accessibleGroupIds.add(group.id);
    }
  } else if (session.role === "coach") {
    for (const owner of coachOwners) {
      if (owner.coach_account_id === session.accountId) {
        accessibleGroupIds.add(owner.group_id);
      }
    }
  } else {
    for (const membership of memberMemberships) {
      if (membership.membership_type === "member") {
        accessibleGroupIds.add(membership.group_id);
      }
    }
  }

  const quickEntryOptions = groups
    .filter((group) => accessibleGroupIds.has(group.id))
    .sort((a, b) => {
      const aLabel = `${a.class?.code ?? ""}-${a.code}-${a.name}`;
      const bLabel = `${b.class?.code ?? ""}-${b.code}-${b.name}`;
      return aLabel.localeCompare(bLabel, "zh-Hant");
    })
    .map((group) => ({
      id: group.id,
      label: `${group.class?.code ?? "N/A"} / ${group.code} ${group.name}`,
    }));

  const roleLabel =
    session.role === "admin" ? "管理員" : session.role === "coach" ? "教練" : "學員";

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            PM-ABC
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            歡迎回來，{session.displayName || session.email}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            目前登入身份：<strong>{roleLabel}</strong>（{session.email}）
          </p>
        </div>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <GroupQuickEntry
        title={
          session.role === "coach"
            ? "快速進入我負責的小組"
            : session.role === "member"
              ? "快速進入我被分派的小組"
              : "快速進入小組"
        }
        description={
          session.role === "coach"
            ? "可直接選擇你擔任擁有者的小組並進入追蹤表。"
            : session.role === "member"
              ? "可直接選擇你被分派的小組並進入追蹤表。"
              : "管理員可直接選擇任一小組進入追蹤表。"
        }
        options={quickEntryOptions}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">操作指引</h2>
        {session.role === "member" ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>請從左側「我的小組」進入你被指派的小組。</li>
            <li>學員不可管理班別、小組建立與學員帳號。</li>
            <li>R&R 與通訊錄請先進入單一小組後操作。</li>
            <li>帳號資訊請至「帳號設定」頁面。</li>
          </ul>
        ) : (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>請從左側選單進入班別、小組與學員管理。</li>
            <li>R&R 與通訊錄請先進入「小組管理」後，再從單一小組操作。</li>
            <li>管理員可由左側選單進入「教練審核中心」。</li>
            <li>帳號資訊與密碼設定請至「帳號設定」頁面。</li>
          </ul>
        )}
      </section>
    </AppShell>
  );
}
