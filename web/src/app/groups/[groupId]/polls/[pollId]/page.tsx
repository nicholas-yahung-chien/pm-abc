import { redirect } from "next/navigation";
import { castGroupPollVoteAction, retractGroupPollVoteAction } from "@/app/group-comms-actions";
import { AppShell } from "@/components/app-shell";
import { GroupFeatureNavBar } from "@/components/group-feature-nav-bar";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  listGroups,
  listGroupPolls,
  listGroupPollOptions,
  listGroupPollVotes,
  listMembershipsByEmail,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";
import type { GroupPollOptionRow, GroupPollVoteRow } from "@/lib/types";

type Params = Promise<{ groupId: string; pollId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export default async function PollDetailPage({
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

  const { groupId, pollId } = await params;
  const query = await searchParams;
  const status = pickSearchParam(query.status);
  const message = pickSearchParam(query.message);

  const [groups, myMemberships, polls, options, votes] = await Promise.all([
    listGroups(),
    session.role === "member" ? listMembershipsByEmail(session.email) : Promise.resolve([]),
    listGroupPolls(groupId),
    listGroupPollOptions(pollId),
    listGroupPollVotes(pollId),
  ]);

  if (
    session.role === "member" &&
    !myMemberships.some((m) => m.group_id === groupId)
  ) {
    redirect(`/groups?status=error&message=${encodeURIComponent("學員僅可管理已被指派的小組。")}`);
  }

  const group = groups.find((g) => g.id === groupId);
  if (!group) redirect(`/groups?status=error&message=${encodeURIComponent("找不到指定小組。")}`);

  const poll = polls.find((p) => p.id === pollId);
  if (!poll) redirect(`/groups/${groupId}/polls?status=error&message=${encodeURIComponent("找不到指定投票。")}`);

  // Resolve current user's person ID
  const db = getSupabaseAdminClient();
  let myPersonId: string | null = null;
  if (db) {
    const { data } = await db.from("people").select("id").eq("email", session.email).limit(1);
    myPersonId = (data as { id: string }[] | null)?.[0]?.id ?? null;
  }

  const expired = isExpired(poll.expires_at);
  const isCoach = session.role === "coach" || session.role === "admin";
  const canVote = !expired && !!myPersonId;

  // Build vote counts per option
  const votesByOption = new Map<string, GroupPollVoteRow[]>();
  for (const vote of votes) {
    const arr = votesByOption.get(vote.option_id) ?? [];
    arr.push(vote);
    votesByOption.set(vote.option_id, arr);
  }

  const myVotedOptionIds = new Set(
    votes.filter((v) => v.person_id === myPersonId).map((v) => v.option_id),
  );

  const maxVotes = Math.max(...options.map((o) => votesByOption.get(o.id)?.length ?? 0), 1);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          {group!.class?.name ?? ""} / {group!.name} / 投票
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{poll.title}</h1>
        {poll.description && (
          <p className="mt-1 text-sm text-slate-600">{poll.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span>{poll.poll_type === "topic" ? "議題投票（單選）" : "時間投票（可複選）"}</span>
          <span>·</span>
          <span>
            截止：{new Date(poll.expires_at).toLocaleString("zh-TW", {
              year: "numeric", month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit", hour12: false,
            })}
          </span>
          {expired && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-semibold text-slate-600">已結束</span>
          )}
        </div>
        <div className="mt-3">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <GroupFeatureNavBar groupId={groupId} classId={group!.class_id} current="polls" />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            選項與結果
            <span className="ml-2 text-xs font-normal text-slate-500">共 {votes.length} 票</span>
          </h2>
          {!expired && (
            <span className="text-xs text-slate-400">
              {poll.poll_type === "topic" ? "單選" : "可複選多個時段"}
            </span>
          )}
        </div>

        <form action={castGroupPollVoteAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="pollId" value={pollId} />

          <div className="divide-y divide-slate-100">
            {options.map((option) => {
              const optVotes = votesByOption.get(option.id) ?? [];
              const pct = maxVotes > 0 ? (optVotes.length / maxVotes) * 100 : 0;
              const iVoted = myVotedOptionIds.has(option.id);

              return (
                <OptionRow
                  key={option.id}
                  option={option}
                  votes={optVotes}
                  pct={pct}
                  iVoted={iVoted}
                  pollType={poll.poll_type}
                  canVote={canVote}
                  groupId={groupId}
                  pollId={pollId}
                  isCoach={isCoach}
                />
              );
            })}
          </div>

          {canVote && (
            <div className="border-t border-slate-100 px-5 py-3">
              <button
                type="submit"
                className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
              >
                確認投票
              </button>
            </div>
          )}
        </form>
      </section>

      <div className="flex justify-start">
        <a
          href={`/groups/${groupId}/polls`}
          className="text-sm text-amber-700 underline"
        >
          ← 回到投票列表
        </a>
      </div>
    </AppShell>
  );
}

function OptionRow({
  option,
  votes,
  pct,
  iVoted,
  pollType,
  canVote,
  groupId,
  pollId,
  isCoach,
}: {
  option: GroupPollOptionRow;
  votes: GroupPollVoteRow[];
  pct: number;
  iVoted: boolean;
  pollType: "topic" | "time";
  canVote: boolean;
  groupId: string;
  pollId: string;
  isCoach: boolean;
}) {
  const inputType = pollType === "time" ? "checkbox" : "radio";

  return (
    <div className="px-5 py-3">
      <div className="flex items-start gap-3">
        {canVote && (
          <input
            type={inputType}
            name="optionId"
            value={option.id}
            defaultChecked={iVoted}
            className="mt-0.5 accent-amber-600"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${iVoted ? "text-amber-700" : "text-slate-800"}`}>
              {option.label}
            </span>
            {iVoted && (
              <span className="text-xs text-amber-600 font-semibold">✓ 已投票</span>
            )}
          </div>
          {option.slot_datetime && (
            <p className="mt-0.5 text-xs text-slate-500">
              {new Date(option.slot_datetime).toLocaleString("zh-TW", {
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", hour12: false,
              })}
            </p>
          )}
          {/* Vote bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-amber-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 tabular-nums">{votes.length} 票</span>
          </div>
          {/* Voter names — visible to coach always, to members after poll expires */}
          {(isCoach || /* show to members too after expiry handled by parent */ false) && votes.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              {votes.map((v) => {
                const p = v.person as { display_name?: string; full_name?: string } | null;
                return p?.display_name || p?.full_name || "—";
              }).join("、")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
