import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createGroupStudyReadingItemAction,
  createGroupStudySessionAction,
  deleteGroupStudyReadingItemAction,
  deleteGroupStudySessionAction,
  moveGroupStudyReadingItemAction,
  moveGroupStudySessionAction,
  replaceGroupStudySessionDutyMembersAction,
  setGroupStudyReadingAssignmentAction,
  updateGroupStudyReadingItemAction,
  updateGroupStudySessionAction,
} from "@/app/group-study-actions";
import { AppShell } from "@/components/app-shell";
import { GroupStudyManagementPanel } from "@/components/group-study-management-panel";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listClassCourseChaptersByClassId,
  listClassCourseItemsByClassId,
  listClassCourseTopicsByClassId,
  listGroupStudyReadingAssignmentsByGroupId,
  listGroupStudyReadingItemsByGroupId,
  listGroupStudySessionDutyMembersByGroupId,
  listGroupStudySessionsByGroupId,
  listGroups,
  listMemberships,
  listMembershipsByEmail,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type Params = Promise<{ groupId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GroupStudyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const encoded = encodeURIComponent("\u8acb\u5148\u767b\u5165\u5f8c\u518d\u7e7c\u7e8c\u4f7f\u7528\u3002");
    redirect(`/login?status=error&message=${encoded}`);
  }

  const { groupId } = await params;
  const query = await searchParams;
  const status = pickSearchParam(query.status);
  const message = pickSearchParam(query.message);

  const [groups, memberships, myMemberships] = await Promise.all([
    listGroups(),
    listMemberships(),
    session.role === "member" ? listMembershipsByEmail(session.email) : Promise.resolve([]),
  ]);

  if (
    session.role === "member" &&
    !myMemberships.some((membership) => membership.group_id === groupId)
  ) {
    const encoded = encodeURIComponent(
      "\u5b78\u54e1\u50c5\u53ef\u7ba1\u7406\u5df2\u88ab\u6307\u6d3e\u7684\u5c0f\u7d44\u3002",
    );
    redirect(`/groups?status=error&message=${encoded}`);
  }

  const group = groups.find((item) => item.id === groupId);
  if (!group) {
    const encoded = encodeURIComponent("\u627e\u4e0d\u5230\u6307\u5b9a\u5c0f\u7d44\u3002");
    redirect(`/groups?status=error&message=${encoded}`);
  }

  const [
    sessions,
    dutyMembers,
    readingItems,
    readingAssignments,
    classCourseItems,
    classCourseTopics,
    classCourseChapters,
  ] = await Promise.all([
    listGroupStudySessionsByGroupId(groupId),
    listGroupStudySessionDutyMembersByGroupId(groupId),
    listGroupStudyReadingItemsByGroupId(groupId),
    listGroupStudyReadingAssignmentsByGroupId(groupId),
    listClassCourseItemsByClassId(group.class_id),
    listClassCourseTopicsByClassId(group.class_id),
    listClassCourseChaptersByClassId(group.class_id),
  ]);

  const memberOptions = memberships
    .filter((item) => item.group_id === groupId && item.membership_type === "member")
    .map((item) => ({
      id: item.person_id,
      label: item.person?.display_name?.trim() || item.person?.full_name?.trim() || "\u5b78\u54e1",
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-Hant"));

  const sortedItems = [...classCourseItems].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
  const sortedTopics = [...classCourseTopics].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );

  const itemOrderById = new Map(sortedItems.map((item, index) => [item.id, index + 1]));
  const topicOrderById = new Map<string, number>();
  const topicsByItemId = new Map<string, typeof sortedTopics>();
  for (const topic of sortedTopics) {
    const list = topicsByItemId.get(topic.class_course_item_id) ?? [];
    list.push(topic);
    topicsByItemId.set(topic.class_course_item_id, list);
  }
  for (const [, rows] of topicsByItemId) {
    rows.forEach((row, index) => topicOrderById.set(row.id, index + 1));
  }

  const chapterOptions = [...classCourseChapters]
    .sort((a, b) => {
      const aItemOrder =
        itemOrderById.get(a.topic?.class_course_item_id ?? "") ?? Number.MAX_SAFE_INTEGER;
      const bItemOrder =
        itemOrderById.get(b.topic?.class_course_item_id ?? "") ?? Number.MAX_SAFE_INTEGER;
      if (aItemOrder !== bItemOrder) return aItemOrder - bItemOrder;

      const aTopicOrder = topicOrderById.get(a.class_course_topic_id) ?? Number.MAX_SAFE_INTEGER;
      const bTopicOrder = topicOrderById.get(b.class_course_topic_id) ?? Number.MAX_SAFE_INTEGER;
      if (aTopicOrder !== bTopicOrder) return aTopicOrder - bTopicOrder;

      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.created_at.localeCompare(b.created_at);
    })
    .map((chapter) => {
      const itemOrder = itemOrderById.get(chapter.topic?.class_course_item_id ?? "") ?? 0;
      const topicOrder = topicOrderById.get(chapter.class_course_topic_id) ?? 0;
      const prefix =
        itemOrder && topicOrder
          ? `\u8ab2\u7a0b ${itemOrder} / \u4e3b\u984c ${itemOrder}.${topicOrder}`
          : "\u8ab2\u7a0b\u7ae0\u7bc0";
      const page = chapter.paper_page?.trim() ? `\uff08${chapter.paper_page.trim()}\uff09` : "";
      return { id: chapter.id, label: `${prefix} / ${chapter.title}${page}` };
    });

  const returnTo = `/groups/${groupId}/study`;
  const canManage = session.role !== "member";

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          {"\u5c0f\u7d44\u7ba1\u7406 / \u8b80\u66f8\u6703"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {group.class?.code} / {group.code} {group.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {"\u7dad\u8b77\u8b80\u66f8\u6703\u6d3b\u52d5\u3001\u503c\u65e5\u751f\u8207\u5c0e\u8b80\u5206\u914d\u3002"}
        </p>
        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href={`/groups/${groupId}`} className="text-amber-700 underline">
            {"\u56de\u5230\u5c0f\u7d44\u7e3d\u89bd"}
          </Link>
          <Link href={`/groups/${groupId}/directory`} className="text-amber-700 underline">
            {"\u524d\u5f80\u901a\u8a0a\u9304"}
          </Link>
          <Link href={`/groups/${groupId}/roles`} className="text-amber-700 underline">
            {"\u524d\u5f80 R&R"}
          </Link>
          <Link href={`/classes/${group.class_id}/courses`} className="text-amber-700 underline">
            {"\u67e5\u770b\u8ab2\u7a0b\u8868"}
          </Link>
        </div>
      </section>

      <GroupStudyManagementPanel
        groupId={groupId}
        returnTo={returnTo}
        canManage={canManage}
        sessions={sessions}
        dutyMembers={dutyMembers}
        readingItems={readingItems}
        readingAssignments={readingAssignments}
        memberOptions={memberOptions}
        chapterOptions={chapterOptions}
        onCreateSessionAction={createGroupStudySessionAction}
        onUpdateSessionAction={updateGroupStudySessionAction}
        onDeleteSessionAction={deleteGroupStudySessionAction}
        onMoveSessionAction={moveGroupStudySessionAction}
        onReplaceDutyMembersAction={replaceGroupStudySessionDutyMembersAction}
        onCreateReadingItemAction={createGroupStudyReadingItemAction}
        onUpdateReadingItemAction={updateGroupStudyReadingItemAction}
        onDeleteReadingItemAction={deleteGroupStudyReadingItemAction}
        onMoveReadingItemAction={moveGroupStudyReadingItemAction}
        onSetReadingAssignmentAction={setGroupStudyReadingAssignmentAction}
      />
    </AppShell>
  );
}
