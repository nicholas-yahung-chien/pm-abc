import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import {
  copyTrackingItemAction,
  createTrackingItemAction,
  createTrackingSectionAction,
  createTrackingSubsectionAction,
  deleteTrackingItemAction,
  deleteTrackingSectionAction,
  deleteTrackingSubsectionAction,
  moveTrackingItemAction,
  moveTrackingSectionAction,
  moveTrackingSubsectionAction,
  setTrackingItemMemberCompletionAction,
  updateTrackingItemAction,
  updateTrackingSectionAction,
  updateTrackingSubsectionAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
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

  const sectionById = new Map(groupSections.map((item) => [item.id, item]));

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

  const subsectionOptions = groupSubsections.map((item) => {
    const section = sectionById.get(item.section_id);
    return {
      id: item.id,
      sectionId: item.section_id,
      label: `${section?.title || "未分類大項"} / ${item.title}`,
    };
  });

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
          <table className="min-w-[1080px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-emerald-100 text-slate-800">
                <th className="border-b border-slate-300 px-3 py-3">編號</th>
                <th className="border-b border-slate-300 px-3 py-3">里程碑</th>
                <th className="border-b border-slate-300 px-3 py-3">待辦事項</th>
                {groupMembers.map((member) => (
                  <th key={member.id} className="border-b border-slate-300 px-3 py-3 text-center">
                    <p className="font-semibold text-slate-900">
                      {member.display_name || member.full_name}
                    </p>
                    <p className="text-xs font-normal text-slate-600">{member.full_name}</p>
                  </th>
                ))}
              </tr>
              {!!groupMembers.length && (
                <tr className="bg-emerald-50 text-xs text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2">-</th>
                  <th className="border-b border-slate-200 px-3 py-2">-</th>
                  <th className="border-b border-slate-200 px-3 py-2">-</th>
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
                      <td className="border-b border-blue-900 px-3 py-2 font-semibold">{sectionCode}</td>
                      <td className="border-b border-blue-900 px-3 py-2 font-semibold">
                        {section.title}（{sectionPercent.toFixed(2)}%）
                      </td>
                      <td className="border-b border-blue-900 px-3 py-2 text-xs">
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
                            <td className="border-b border-violet-200 px-3 py-2 font-semibold">
                              {subsectionCode}
                            </td>
                            <td className="border-b border-violet-200 px-3 py-2 font-semibold">
                              {subsection.title}
                            </td>
                            <td className="border-b border-violet-200 px-3 py-2 text-xs">
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
                                <td className="px-3 py-2 font-semibold text-slate-700">{itemCode}</td>
                                <td className="px-3 py-2 text-slate-500">-</td>
                                <td className="px-3 py-2">
                                  <p className="font-medium text-slate-900">{item.title}</p>
                                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                                    {item.content || "-"}
                                  </p>
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
                                    <td key={`${item.id}:${member.id}`} className="px-2 py-2 text-center">
                                      {canToggle ? (
                                        <form action={setTrackingItemMemberCompletionAction}>
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
                                            className={`h-8 w-8 rounded-md border text-lg font-semibold transition ${
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
                                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md border text-lg ${
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
        <section className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">追蹤矩陣管理（教練）</h2>
            <p className="mt-1 text-sm text-slate-600">
              此區塊僅供教練新增與維護追蹤大項、小項與追蹤項目；學員僅可查看上方追蹤矩陣並回報自己的完成狀態。
            </p>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">新增追蹤大項</h3>
                <form action={createTrackingSectionAction} className="mt-3 space-y-3">
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">大項名稱 *</span>
                    <input name="title" required placeholder="例如：課程準備" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">說明</span>
                    <textarea name="description" rows={3} />
                  </label>
                  <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
                    新增大項
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">新增追蹤小項</h3>
                <form action={createTrackingSubsectionAction} className="mt-3 space-y-3">
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">所屬大項 *</span>
                    <select name="sectionId" defaultValue="" required>
                      <option value="" disabled>
                        請選擇大項
                      </option>
                      {groupSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">小項名稱 *</span>
                    <input name="title" required placeholder="例如：讀書會任務" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">說明</span>
                    <textarea name="description" rows={3} />
                  </label>
                  <button
                    disabled={!groupSections.length}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    新增小項
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">新增追蹤項目</h3>
                <form action={createTrackingItemAction} className="mt-3 space-y-3">
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">所屬大項 *</span>
                    <select name="sectionId" defaultValue="" required>
                      <option value="" disabled>
                        請選擇大項
                      </option>
                      {groupSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">所屬小項 *</span>
                    <select name="subsectionId" defaultValue="" required>
                      <option value="" disabled>
                        請選擇小項
                      </option>
                      {subsectionOptions.map((subsection) => (
                        <option key={subsection.id} value={subsection.id}>
                          {subsection.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">項目名稱 *</span>
                    <input name="title" required placeholder="例如：完成第 1 章題庫" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">內容</span>
                    <textarea name="content" rows={2} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">到期日</span>
                    <input name="dueDate" type="date" />
                  </label>
                  <input type="hidden" name="extraData" value="" />
                  <input type="hidden" name="externalUrl" value="" />
                  <button
                    disabled={!groupSubsections.length}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    新增追蹤項目
                  </button>
                </form>
              </div>
            </div>
          </article>

          {groupSections.map((section) => {
            const subsectionRows = groupSubsections.filter((item) => item.section_id === section.id);

            return (
              <article key={section.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">大項管理：{section.title}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={moveTrackingSectionAction}>
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="direction" value="up" />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        title="上移大項"
                      >
                        上
                      </button>
                    </form>
                    <form action={moveTrackingSectionAction}>
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="direction" value="down" />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        title="下移大項"
                      >
                        下
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <form action={updateTrackingSectionAction} className="grid grow gap-2 md:grid-cols-2">
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-700">大項名稱 *</span>
                      <input name="title" defaultValue={section.title} required />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-700">說明</span>
                      <textarea name="description" rows={2} defaultValue={section.description} />
                    </label>
                    <div className="md:col-span-2">
                      <button className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-900">
                        儲存大項
                      </button>
                    </div>
                  </form>

                  <form action={deleteTrackingSectionAction}>
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                      刪除大項
                    </button>
                  </form>
                </div>

                <div className="mt-4 space-y-4">
                  {subsectionRows.map((subsection) => {
                    const items = itemsBySubsectionId.get(subsection.id) ?? [];

                    return (
                      <div key={subsection.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-slate-900">小項管理：{subsection.title}</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <form action={moveTrackingSubsectionAction}>
                              <input type="hidden" name="groupId" value={groupId} />
                              <input type="hidden" name="sectionId" value={section.id} />
                              <input type="hidden" name="subsectionId" value={subsection.id} />
                              <input type="hidden" name="direction" value="up" />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <button
                                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                title="上移小項"
                              >
                                上
                              </button>
                            </form>
                            <form action={moveTrackingSubsectionAction}>
                              <input type="hidden" name="groupId" value={groupId} />
                              <input type="hidden" name="sectionId" value={section.id} />
                              <input type="hidden" name="subsectionId" value={subsection.id} />
                              <input type="hidden" name="direction" value="down" />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <button
                                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                title="下移小項"
                              >
                                下
                              </button>
                            </form>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <form action={updateTrackingSubsectionAction} className="grid grow gap-2 md:grid-cols-3">
                            <input type="hidden" name="groupId" value={groupId} />
                            <input type="hidden" name="subsectionId" value={subsection.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <select name="sectionId" defaultValue={subsection.section_id} required>
                              {groupSections.map((sectionOption) => (
                                <option key={sectionOption.id} value={sectionOption.id}>
                                  {sectionOption.title}
                                </option>
                              ))}
                            </select>
                            <input name="title" defaultValue={subsection.title} required />
                            <textarea
                              name="description"
                              rows={2}
                              defaultValue={subsection.description}
                              className="md:col-span-3"
                            />
                            <div className="md:col-span-3">
                              <button className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-900">
                                儲存小項
                              </button>
                            </div>
                          </form>

                          <form action={deleteTrackingSubsectionAction}>
                            <input type="hidden" name="groupId" value={groupId} />
                            <input type="hidden" name="subsectionId" value={subsection.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <button className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                              刪除小項
                            </button>
                          </form>
                        </div>

                        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="px-3 py-2">項目</th>
                                <th className="px-3 py-2">到期日</th>
                                <th className="px-3 py-2">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => (
                                <tr key={item.id} className="border-t border-slate-100 align-top">
                                  <td className="px-3 py-2">
                                    <p className="font-medium text-slate-900">{item.title}</p>
                                    <p className="mt-1 text-xs text-slate-600">{item.content || "-"}</p>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-slate-700">
                                    {formatDate(item.due_date)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <details>
                                      <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                                        編輯 / 搬移 / 複製 / 刪除
                                      </summary>
                                      <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                                        <form action={updateTrackingItemAction} className="grid gap-2">
                                          <input type="hidden" name="groupId" value={groupId} />
                                          <input type="hidden" name="itemId" value={item.id} />
                                          <input type="hidden" name="returnTo" value={returnTo} />
                                          <select name="sectionId" defaultValue={item.section_id} required>
                                            {groupSections.map((sectionOption) => (
                                              <option key={sectionOption.id} value={sectionOption.id}>
                                                {sectionOption.title}
                                              </option>
                                            ))}
                                          </select>
                                          <select name="subsectionId" defaultValue={item.subsection_id} required>
                                            {subsectionOptions.map((subsectionOption) => (
                                              <option key={subsectionOption.id} value={subsectionOption.id}>
                                                {subsectionOption.label}
                                              </option>
                                            ))}
                                          </select>
                                          <input name="title" defaultValue={item.title} required />
                                          <textarea name="content" rows={2} defaultValue={item.content} />
                                          <input name="dueDate" type="date" defaultValue={item.due_date || ""} />
                                          <input type="hidden" name="extraData" value={item.extra_data} />
                                          <input type="hidden" name="externalUrl" value={item.external_url} />
                                          <button className="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-900">
                                            儲存項目
                                          </button>
                                        </form>

                                        <form action={moveTrackingItemAction} className="grid gap-2">
                                          <input type="hidden" name="groupId" value={groupId} />
                                          <input type="hidden" name="itemId" value={item.id} />
                                          <input type="hidden" name="returnTo" value={returnTo} />
                                          <select name="targetSectionId" defaultValue={item.section_id} required>
                                            {groupSections.map((sectionOption) => (
                                              <option key={sectionOption.id} value={sectionOption.id}>
                                                {sectionOption.title}
                                              </option>
                                            ))}
                                          </select>
                                          <select name="targetSubsectionId" defaultValue={item.subsection_id} required>
                                            {subsectionOptions.map((subsectionOption) => (
                                              <option key={subsectionOption.id} value={subsectionOption.id}>
                                                {subsectionOption.label}
                                              </option>
                                            ))}
                                          </select>
                                          <button className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700">
                                            搬移項目
                                          </button>
                                        </form>

                                        <form action={copyTrackingItemAction} className="grid gap-2">
                                          <input type="hidden" name="groupId" value={groupId} />
                                          <input type="hidden" name="itemId" value={item.id} />
                                          <input type="hidden" name="returnTo" value={returnTo} />
                                          <select name="targetSectionId" defaultValue={item.section_id} required>
                                            {groupSections.map((sectionOption) => (
                                              <option key={sectionOption.id} value={sectionOption.id}>
                                                {sectionOption.title}
                                              </option>
                                            ))}
                                          </select>
                                          <select name="targetSubsectionId" defaultValue={item.subsection_id} required>
                                            {subsectionOptions.map((subsectionOption) => (
                                              <option key={subsectionOption.id} value={subsectionOption.id}>
                                                {subsectionOption.label}
                                              </option>
                                            ))}
                                          </select>
                                          <button className="rounded-md bg-teal-600 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-700">
                                            複製項目
                                          </button>
                                        </form>

                                        <form action={deleteTrackingItemAction}>
                                          <input type="hidden" name="groupId" value={groupId} />
                                          <input type="hidden" name="itemId" value={item.id} />
                                          <input type="hidden" name="returnTo" value={returnTo} />
                                          <button className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                                            刪除此項目
                                          </button>
                                        </form>
                                      </div>
                                    </details>
                                  </td>
                                </tr>
                              ))}

                              {!items.length && (
                                <tr>
                                  <td className="px-3 py-4 text-slate-500" colSpan={3}>
                                    此小項尚無追蹤項目。
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}

                  {!subsectionRows.length && (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      此大項尚無追蹤小項。
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
