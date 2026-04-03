import { redirect } from "next/navigation";
import {
  deleteGroupPollAction,
} from "@/app/group-comms-actions";
import { AppShell } from "@/components/app-shell";
import { GroupFeatureNavBar } from "@/components/group-feature-nav-bar";
import { PollCreateForm } from "@/components/poll-create-form";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listGroups,
  listGroupPolls,
  listMembershipsByEmail,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";
import type { GroupPollRow } from "@/lib/types";

type Params = Promise<{ groupId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleString("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

const POLL_TYPE_LABELS = { topic: "議題投票", time: "時間投票" };

export default async function GroupPollsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?status=error&message=${encodeURIComponent("請先登入後再繼續使用。")}`);
  }

  const { groupId } = await params;
  const query = await searchParams;
  const status = pickSearchParam(query.status);
  const message = pickSearchParam(query.message);

  const [groups, myMemberships, polls] = await Promise.all([
    listGroups(),
    session.role === "member" ? listMembershipsByEmail(session.email) : Promise.resolve([]),
    listGroupPolls(groupId),
  ]);

  if (
    session.role === "member" &&
    !myMemberships.some((m) => m.group_id === groupId)
  ) {
    redirect(`/groups?status=error&message=${encodeURIComponent("學員僅可管理已被指派的小組。")}`);
  }

  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    redirect(`/groups?status=error&message=${encodeURIComponent("找不到指定小組。")}`);
  }

  const isCoach = session.role === "coach" || session.role === "admin";
  const activePolls = polls.filter((p) => !isExpired(p.expires_at));
  const closedPolls = polls.filter((p) => isExpired(p.expires_at));

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          {group.class?.name ?? ""} / {group.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">投票</h1>
        <div className="mt-3">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <GroupFeatureNavBar groupId={groupId} classId={group.class_id} current="polls" />

      {/* Create poll form — coach only */}
      {isCoach && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">建立新投票</h2>
          <PollCreateForm groupId={groupId} />
        </section>
      )}

      {/* Active polls */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            進行中的投票
            <span className="ml-2 text-xs font-normal text-slate-500">{activePolls.length} 個</span>
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {activePolls.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">目前尚無進行中的投票。</p>
          ) : (
            activePolls.map((poll) => (
              <PollListItem key={poll.id} poll={poll} groupId={groupId} isCoach={isCoach} />
            ))
          )}
        </div>
      </section>

      {/* Closed polls */}
      {closedPolls.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">
              已結束的投票
              <span className="ml-2 text-xs font-normal text-slate-500">{closedPolls.length} 個</span>
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {closedPolls.map((poll) => (
              <PollListItem key={poll.id} poll={poll} groupId={groupId} isCoach={isCoach} />
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function PollListItem({
  poll,
  groupId,
  isCoach,
}: {
  poll: GroupPollRow;
  groupId: string;
  isCoach: boolean;
}) {
  const expired = isExpired(poll.expires_at);
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={`/groups/${groupId}/polls/${poll.id}`}
            className="truncate text-sm font-semibold text-slate-800 hover:text-amber-700"
          >
            {poll.title}
          </a>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
            {POLL_TYPE_LABELS[poll.poll_type]}
          </span>
          {expired ? (
            <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-500">已結束</span>
          ) : (
            <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">進行中</span>
          )}
        </div>
        {poll.description && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{poll.description}</p>
        )}
        <p className="mt-0.5 text-xs text-slate-400">
          截止：{new Date(poll.expires_at).toLocaleString("zh-TW", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false,
          })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={`/groups/${groupId}/polls/${poll.id}`}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          {expired ? "查看結果" : "投票"}
        </a>
        {isCoach && (
          <form action={deleteGroupPollAction}>
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="pollId" value={poll.id} />
            <button
              type="submit"
              className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              刪除
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
