import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import {
  createTrackingItemAction,
  createTrackingSectionAction,
  createTrackingSubsectionAction,
  deleteTrackingItemAction,
  deleteTrackingSectionAction,
  deleteTrackingSubsectionAction,
  moveTrackingItemOrderAction,
  moveTrackingSectionAction,
  moveTrackingSubsectionAction,
  setTrackingItemMemberCompletionAction,
  updateTrackingItemAction,
  updateTrackingSectionAction,
  updateTrackingSubsectionAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { TextPreviewDialogButton } from "@/components/text-preview-dialog-button";
import { TrackingManagementPanel } from "@/components/tracking-management-panel";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listGroups,
  listMemberships,
  listMembershipsByEmail,
  listTrackingItemMemberCompletions,
  listTrackingItems,
  listTrackingSections,
  listTrackingSubsections,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type Params = Promise<{ groupId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function formatDate(dateInput: string | null): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString("zh-TW");
}

function buildCompletionKey(left: string, right: string): string {
  return `${left}:${right}`;
}

function toPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return (completed / total) * 100;
}

export default async function GroupTrackingPage({
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

  const [
    groups,
    memberships,
    myMemberships,
    trackingSections,
    trackingSubsections,
    trackingItems,
    trackingItemCompletions,
  ] = await Promise.all([
    listGroups(),
    listMemberships(),
    session.role === "member" ? listMembershipsByEmail(session.email) : Promise.resolve([]),
    listTrackingSections(),
    listTrackingSubsections(),
    listTrackingItems(),
    listTrackingItemMemberCompletions(),
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

  const returnTo = `/groups/${groupId}`;
  const canManageStructure = session.role === "coach";

  const currentMemberPersonId =
    session.role === "member"
      ? myMemberships.find(
          (membership) =>
            membership.group_id === groupId && membership.membership_type === "member",
        )?.person_id ?? null
      : null;

  const groupMembers = memberships
    .filter((item) => item.group_id === groupId && item.membership_type === "member")
    .map((item) => item.person)
    .filter((person): person is NonNullable<typeof person> => Boolean(person));

  const groupMemberIdSet = new Set(groupMembers.map((item) => item.id));

  const groupSections = trackingSections
    .filter((item) => item.group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  const groupSubsections = trackingSubsections
    .filter((item) => item.group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  const groupItems = trackingItems
    .filter((item) => item.group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  const itemById = new Map(groupItems.map((item) => [item.id, item]));

  const completionRows = trackingItemCompletions.filter(
    (item) =>
      item.group_id === groupId &&
      item.is_completed &&
      groupMemberIdSet.has(item.person_id) &&
      itemById.has(item.item_id),
  );

  const completionKeySet = new Set(
    completionRows.map((item) => buildCompletionKey(item.item_id, item.person_id)),
  );

  const sectionItemCountById = new Map<string, number>();
  const subsectionItemCountById = new Map<string, number>();
  for (const item of groupItems) {
    sectionItemCountById.set(item.section_id, (sectionItemCountById.get(item.section_id) ?? 0) + 1);
    subsectionItemCountById.set(
      item.subsection_id,
      (subsectionItemCountById.get(item.subsection_id) ?? 0) + 1,
    );
  }

  const completedCellCountBySectionId = new Map<string, number>();
  const completedCellCountBySubsectionId = new Map<string, number>();
  const completedCellCountBySectionAndMember = new Map<string, number>();
  const completedCellCountBySubsectionAndMember = new Map<string, number>();

  for (const completion of completionRows) {
    const item = itemById.get(completion.item_id);
    if (!item) continue;

    completedCellCountBySectionId.set(
      item.section_id,
      (completedCellCountBySectionId.get(item.section_id) ?? 0) + 1,
    );
    completedCellCountBySubsectionId.set(
      item.subsection_id,
      (completedCellCountBySubsectionId.get(item.subsection_id) ?? 0) + 1,
    );

    const sectionMemberKey = buildCompletionKey(item.section_id, completion.person_id);
    completedCellCountBySectionAndMember.set(
      sectionMemberKey,
      (completedCellCountBySectionAndMember.get(sectionMemberKey) ?? 0) + 1,
    );

    const subsectionMemberKey = buildCompletionKey(item.subsection_id, completion.person_id);
    completedCellCountBySubsectionAndMember.set(
      subsectionMemberKey,
      (completedCellCountBySubsectionAndMember.get(subsectionMemberKey) ?? 0) + 1,
    );
  }

  const totalCells = groupItems.length * groupMembers.length;
  const overallCompletionPercent = toPercent(completionRows.length, totalCells);

  const itemsBySubsectionId = new Map<string, typeof groupItems>();
  for (const item of groupItems) {
    const list = itemsBySubsectionId.get(item.subsection_id) ?? [];
    list.push(item);
    itemsBySubsectionId.set(item.subsection_id, list);
  }

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          小組管理 / 追蹤表
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {group.class?.code} / {group.code} {group.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{group.description || "-"}</p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">追蹤大項</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{groupSections.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">追蹤小項</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{groupSubsections.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">追蹤項目</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{groupItems.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-xs text-emerald-700">整體完成率</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-800">
              {overallCompletionPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href={`/groups/${groupId}/directory`} className="text-amber-700 underline">
            前往通訊錄
          </Link>
          <Link href={`/groups/${groupId}/roles`} className="text-amber-700 underline">
            前往 R&R
          </Link>
          <Link href="/groups" className="text-amber-700 underline">
            回到小組列表
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">追蹤矩陣</h2>
        <p className="mt-1 text-sm text-slate-600">
          以里程碑與待辦事項為列、學員為欄，直接查看並回報每位學員完成狀態。
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="table-fixed min-w-max border-collapse text-left text-sm">
            <colgroup>
              <col className="w-24 min-w-24" />
              <col className="w-56 min-w-56" />
              <col className="w-80 min-w-80" />
              {groupMembers.map((member) => (
                <col key={`member-col-${member.id}`} className="w-32 min-w-32" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-emerald-100 text-slate-800">
                <th className="sticky left-0 z-40 w-24 min-w-24 border-b border-slate-300 bg-emerald-100 px-3 py-3">
                  編號
                </th>
                <th className="sticky left-24 z-40 w-56 min-w-56 border-b border-slate-300 bg-emerald-100 px-3 py-3">
                  里程碑
                </th>
                <th className="sticky left-80 z-40 w-80 min-w-80 border-b border-slate-300 bg-emerald-100 px-3 py-3 shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]">
                  待辦事項
                </th>
                {groupMembers.map((member) => (
                  <th
                    key={member.id}
                    className="min-w-[8rem] border-b border-slate-300 px-3 py-3 text-center"
                  >
                    <p className="font-semibold text-slate-900">
                      {member.display_name || member.full_name}
                    </p>
                    <p className="text-xs font-normal text-slate-600">{member.full_name}</p>
                  </th>
                ))}
              </tr>
              {!!groupMembers.length && (
                <tr className="bg-emerald-50 text-xs text-slate-600">
                  <th className="sticky left-0 z-30 w-24 min-w-24 border-b border-slate-200 bg-emerald-50 px-3 py-2">
                    -
                  </th>
                  <th className="sticky left-24 z-30 w-56 min-w-56 border-b border-slate-200 bg-emerald-50 px-3 py-2">
                    -
                  </th>
                  <th className="sticky left-80 z-30 w-80 min-w-80 border-b border-slate-200 bg-emerald-50 px-3 py-2 shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]">
                    -
                  </th>
                  {groupMembers.map((member, index) => (
                    <th key={member.id} className="border-b border-slate-200 px-3 py-2 text-center">
                      {index + 1}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {!groupSections.length && (
                <tr>
                  <td className="px-3 py-5 text-slate-500" colSpan={3 + groupMembers.length}>
                    目前尚無追蹤大項。請先建立追蹤大項與小項後，再新增追蹤項目。
                  </td>
                </tr>
              )}

              {groupSections.map((section, sectionIndex) => {
                const sectionCode = String(sectionIndex);
                const subsectionRows = groupSubsections.filter((item) => item.section_id === section.id);
                const sectionItemCount = sectionItemCountById.get(section.id) ?? 0;
                const sectionTotalCells = sectionItemCount * groupMembers.length;
                const sectionCompletedCells = completedCellCountBySectionId.get(section.id) ?? 0;
                const sectionPercent = toPercent(sectionCompletedCells, sectionTotalCells);

                return (
                  <Fragment key={section.id}>
                    <tr key={`${section.id}-summary`} className="bg-blue-700 text-white">
                      <td className="sticky left-0 z-20 w-24 min-w-24 border-b border-blue-900 bg-blue-700 px-3 py-2 font-semibold">{sectionCode}</td>
                      <td className="sticky left-24 z-20 w-56 min-w-56 border-b border-blue-900 bg-blue-700 px-3 py-2 font-semibold">
                        {section.title}（{sectionPercent.toFixed(2)}%）
                      </td>
                      <td className="sticky left-80 z-20 w-80 min-w-80 border-b border-blue-900 bg-blue-700 px-3 py-2 text-xs shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]">
                        {section.description || "-"}
                      </td>
                      {groupMembers.map((member) => {
                        const completedByMember =
                          completedCellCountBySectionAndMember.get(
                            buildCompletionKey(section.id, member.id),
                          ) ?? 0;
                        const memberPercent = toPercent(completedByMember, sectionItemCount);
                        return (
                          <td
                            key={`${section.id}:${member.id}:summary`}
                            className="border-b border-blue-900 px-2 py-2 text-center text-xs font-semibold"
                          >
                            {memberPercent.toFixed(2)}%
                          </td>
                        );
                      })}
                    </tr>

                    {subsectionRows.map((subsection, subsectionIndex) => {
                      const subsectionCode = `${sectionCode}.${subsectionIndex + 1}`;
                      const subsectionItemCount = subsectionItemCountById.get(subsection.id) ?? 0;

                      return (
                        <Fragment key={subsection.id}>
                          <tr key={`${subsection.id}-summary`} className="bg-violet-100 text-slate-800">
                            <td className="sticky left-0 z-20 w-24 min-w-24 border-b border-violet-200 bg-violet-100 px-3 py-2 font-semibold">
                              {subsectionCode}
                            </td>
                            <td className="sticky left-24 z-20 w-56 min-w-56 border-b border-violet-200 bg-violet-100 px-3 py-2 font-semibold">
                              {subsection.title}
                            </td>
                            <td className="sticky left-80 z-20 w-80 min-w-80 border-b border-violet-200 bg-violet-100 px-3 py-2 text-xs shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]">
                              {subsection.description || "-"}
                            </td>
                            {groupMembers.map((member) => {
                              const completedByMember =
                                completedCellCountBySubsectionAndMember.get(
                                  buildCompletionKey(subsection.id, member.id),
                                ) ?? 0;
                              const memberPercent = toPercent(completedByMember, subsectionItemCount);
                              return (
                                <td
                                  key={`${subsection.id}:${member.id}:summary`}
                                  className="border-b border-violet-200 px-2 py-2 text-center text-xs font-semibold"
                                >
                                  {memberPercent.toFixed(2)}%
                                </td>
                              );
                            })}
                          </tr>

                          {(itemsBySubsectionId.get(subsection.id) ?? []).map((item, itemIndex) => {
                            const itemCode = `${subsectionCode}.${itemIndex + 1}`;
                            return (
                              <tr key={item.id} className="border-b border-slate-200 align-top">
                                <td className="sticky left-0 z-10 w-24 min-w-24 bg-white px-3 py-2 font-semibold text-slate-700">{itemCode}</td>
                                <td className="sticky left-24 z-10 w-56 min-w-56 bg-white px-3 py-2 text-slate-500">-</td>
                                <td className="sticky left-80 z-10 w-80 min-w-80 bg-white px-3 py-2 shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]">
                                  {item.external_url ? (
                                    <a
                                      href={item.external_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-800"
                                    >
                                      {item.title}
                                    </a>
                                  ) : (
                                    <p className="font-medium text-slate-900">{item.title}</p>
                                  )}
                                  <div className="mt-1">
                                    <TextPreviewDialogButton
                                      title={item.title}
                                      text={item.content || ""}
                                      maxLen={18}
                                    />
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    到期日：{formatDate(item.due_date)}
                                  </p>
                                </td>

                                {groupMembers.map((member) => {
                                  const completed = completionKeySet.has(
                                    buildCompletionKey(item.id, member.id),
                                  );
                                  const canToggle =
                                    session.role === "coach" || currentMemberPersonId === member.id;

                                  return (
                                    <td
                                      key={`${item.id}:${member.id}`}
                                      className="px-2 py-2 align-middle text-center"
                                    >
                                      {canToggle ? (
                                        <form
                                          action={setTrackingItemMemberCompletionAction}
                                          className="flex items-center justify-center"
                                        >
                                          <input type="hidden" name="groupId" value={groupId} />
                                          <input type="hidden" name="itemId" value={item.id} />
                                          <input type="hidden" name="personId" value={member.id} />
                                          <input type="hidden" name="returnTo" value={returnTo} />
                                          <input
                                            type="hidden"
                                            name="isCompleted"
                                            value={completed ? "false" : "true"}
                                          />
                                          <button
                                            title={completed ? "取消完成" : "標記完成"}
                                            className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-semibold leading-none transition ${
                                              completed
                                                ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
                                                : "border-slate-300 bg-white text-slate-500 hover:border-emerald-400 hover:text-emerald-600"
                                            }`}
                                          >
                                            {completed ? "✓" : ""}
                                          </button>
                                        </form>
                                      ) : (
                                        <div
                                          className={`mx-auto inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] leading-none ${
                                            completed
                                              ? "border-emerald-700 bg-emerald-700 text-white"
                                              : "border-slate-300 bg-slate-100 text-slate-400"
                                          }`}
                                        >
                                          {completed ? "✓" : ""}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}

                          {!(itemsBySubsectionId.get(subsection.id) ?? []).length && (
                            <tr key={`${subsection.id}-empty`}>
                              <td
                                className="px-3 py-3 text-xs text-slate-500"
                                colSpan={3 + groupMembers.length}
                              >
                                此小項尚無追蹤項目。
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}

                    {!subsectionRows.length && (
                      <tr key={`${section.id}-empty`}>
                        <td
                          className="px-3 py-3 text-xs text-slate-500"
                          colSpan={3 + groupMembers.length}
                        >
                          此大項尚無追蹤小項。
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {canManageStructure && (
        <TrackingManagementPanel
          groupId={groupId}
          returnTo={returnTo}
          sections={groupSections}
          subsections={groupSubsections}
          items={groupItems}
          onCreateSectionAction={createTrackingSectionAction}
          onCreateSubsectionAction={createTrackingSubsectionAction}
          onCreateItemAction={createTrackingItemAction}
          onUpdateSectionAction={updateTrackingSectionAction}
          onDeleteSectionAction={deleteTrackingSectionAction}
          onMoveSectionAction={moveTrackingSectionAction}
          onUpdateSubsectionAction={updateTrackingSubsectionAction}
          onDeleteSubsectionAction={deleteTrackingSubsectionAction}
          onMoveSubsectionAction={moveTrackingSubsectionAction}
          onUpdateItemAction={updateTrackingItemAction}
          onDeleteItemAction={deleteTrackingItemAction}
          onMoveItemOrderAction={moveTrackingItemOrderAction}
        />
      )}
    </AppShell>
  );
}
