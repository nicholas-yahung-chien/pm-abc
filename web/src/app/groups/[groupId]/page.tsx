import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment, type CSSProperties } from "react";
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
  setTrackingItemMemberResponseAction,
  updateTrackingItemAction,
  updateTrackingSectionAction,
  updateTrackingSubsectionAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { AutoSubmitDateResponseForm } from "@/components/auto-submit-date-response-form";
import { AutoSubmitNumberResponseForm } from "@/components/auto-submit-number-response-form";
import { AutoSubmitSelectResponseForm } from "@/components/auto-submit-select-response-form";
import { GroupFeatureNavBar } from "@/components/group-feature-nav-bar";
import { StatusBanner } from "@/components/status-banner";
import { TextPreviewDialogButton } from "@/components/text-preview-dialog-button";
import { TrackingManagementPanel } from "@/components/tracking-management-panel";
import { getCurrentSession } from "@/lib/auth/session";
import { sendGroupEmailBlastAction } from "@/app/group-comms-actions";
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
import type { TrackingItemMemberCompletionRow, TrackingItemResponseType, TrackingItemRow } from "@/lib/types";

type Params = Promise<{ groupId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function formatDate(dateInput: string | null): string {
  if (!dateInput) return "";
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

function normalizeResponseType(value: unknown): TrackingItemResponseType {
  if (value === "number" || value === "date" || value === "select") return value;
  return "checkbox";
}

function formatNumberValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
    const encoded = encodeURIComponent("學員僅可管理已被指派的小組。");
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

  const visibleMembers =
    session.role === "member" && currentMemberPersonId
      ? groupMembers.filter((member) => member.id === currentMemberPersonId)
      : groupMembers;
  const visibleMemberIdSet = new Set(visibleMembers.map((item) => item.id));

  const groupSections = trackingSections
    .filter((item) => item.group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  const groupSubsections = trackingSubsections
    .filter((item) => item.group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  const visibleGroupSubsections = groupSubsections.filter((item) => !item.is_system_default);
  const hiddenGroupSubsections = groupSubsections.filter((item) => item.is_system_default);

  const visibleSubsectionsBySectionId = new Map<string, typeof visibleGroupSubsections>();
  for (const subsection of visibleGroupSubsections) {
    const list = visibleSubsectionsBySectionId.get(subsection.section_id) ?? [];
    list.push(subsection);
    visibleSubsectionsBySectionId.set(subsection.section_id, list);
  }

  const hiddenSubsectionsBySectionId = new Map<string, typeof hiddenGroupSubsections>();
  for (const subsection of hiddenGroupSubsections) {
    const list = hiddenSubsectionsBySectionId.get(subsection.section_id) ?? [];
    list.push(subsection);
    hiddenSubsectionsBySectionId.set(subsection.section_id, list);
  }

  const groupItems = trackingItems
    .filter((item) => item.group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  const itemById = new Map(groupItems.map((item) => [item.id, item]));

  const responseRows = trackingItemCompletions.filter(
    (item) =>
      item.group_id === groupId &&
      visibleMemberIdSet.has(item.person_id) &&
      itemById.has(item.item_id),
  );
  const completionRows = responseRows.filter((item) => item.is_completed);
  const responseByKey = new Map<string, TrackingItemMemberCompletionRow>();
  for (const responseRow of responseRows) {
    responseByKey.set(buildCompletionKey(responseRow.item_id, responseRow.person_id), responseRow);
  }

  const sectionItemCountById = new Map<string, number>();
  for (const item of groupItems) {
    sectionItemCountById.set(item.section_id, (sectionItemCountById.get(item.section_id) ?? 0) + 1);
  }

  const completedItemCountByMember = new Map<string, number>();
  for (const completion of completionRows) {
    completedItemCountByMember.set(
      completion.person_id,
      (completedItemCountByMember.get(completion.person_id) ?? 0) + 1,
    );
  }

  const totalCells = groupItems.length * visibleMembers.length;
  const overallCompletionPercent = toPercent(completionRows.length, totalCells);

  const itemsBySubsectionId = new Map<string, typeof groupItems>();
  for (const item of groupItems) {
    const list = itemsBySubsectionId.get(item.subsection_id) ?? [];
    list.push(item);
    itemsBySubsectionId.set(item.subsection_id, list);
  }
  const directItemsBySectionId = new Map<string, typeof groupItems>();
  for (const section of groupSections) {
    const directItems = (hiddenSubsectionsBySectionId.get(section.id) ?? []).flatMap(
      (subsection) => itemsBySubsectionId.get(subsection.id) ?? [],
    );
    directItemsBySectionId.set(section.id, directItems);
  }

  const sectionMilestoneBasePercentById = new Map<string, number>();
  let cumulativeItemsBeforeSection = 0;
  for (const section of groupSections) {
    sectionMilestoneBasePercentById.set(
      section.id,
      toPercent(cumulativeItemsBeforeSection, groupItems.length),
    );
    cumulativeItemsBeforeSection += sectionItemCountById.get(section.id) ?? 0;
  }

  const codeLabels: string[] = ["編號", ""];
  const milestoneLabels: string[] = ["里程碑", ""];
  for (const [sectionIndex, section] of groupSections.entries()) {
    const sectionCode = String(sectionIndex);
    codeLabels.push(sectionCode);
    milestoneLabels.push(section.title || "");

    const subsectionRows = visibleSubsectionsBySectionId.get(section.id) ?? [];
    for (const [subsectionIndex, subsection] of subsectionRows.entries()) {
      const subsectionCode = `${sectionCode}.${subsectionIndex + 1}`;
      codeLabels.push(subsectionCode);
      milestoneLabels.push(subsection.title || "");

      const itemRows = itemsBySubsectionId.get(subsection.id) ?? [];
      for (const [itemIndex] of itemRows.entries()) {
        codeLabels.push(`${subsectionCode}.${itemIndex + 1}`);
        milestoneLabels.push("");
      }
    }

    const directItems = directItemsBySectionId.get(section.id) ?? [];
    for (const [directItemIndex] of directItems.entries()) {
      const directCode = `${sectionCode}.${subsectionRows.length + directItemIndex + 1}`;
      codeLabels.push(directCode);
      milestoneLabels.push("");
    }
  }

  const codeMaxChars = Math.max(...codeLabels.map((label) => label.trim().length || 1), 2);
  const milestoneMaxChars = Math.max(
    ...milestoneLabels.map((label) => label.trim().length || 1),
    3,
  );

  const codeColRem = Math.min(Math.max(codeMaxChars * 0.7 + 1.8, 4.5), 8);
  const milestoneColRem = Math.min(Math.max(milestoneMaxChars * 0.9 + 1.8, 8), 16);
  const todoColRem = 20;

  const codeCol = `${codeColRem}rem`;
  const milestoneCol = `${milestoneColRem}rem`;
  const todoCol = `${todoColRem}rem`;
  const memberCol = "9rem";
  const milestoneLeft = codeCol;
  const todoLeft = `${codeColRem + milestoneColRem}rem`;
  const memberColsShouldStretch = visibleMembers.length <= 2;

  const codeCellStyle: CSSProperties = { width: codeCol, minWidth: codeCol };
  const milestoneCellStyle: CSSProperties = { width: milestoneCol, minWidth: milestoneCol };
  const todoCellStyle: CSSProperties = { width: todoCol, minWidth: todoCol };
  const stickyCodeCellStyle: CSSProperties = { ...codeCellStyle, left: "0px" };
  const stickyMilestoneCellStyle: CSSProperties = {
    ...milestoneCellStyle,
    left: milestoneLeft,
  };
  const stickyTodoCellStyle: CSSProperties = { ...todoCellStyle, left: todoLeft };
  const stickyMergedMilestoneTodoCellStyle: CSSProperties = {
    width: `${milestoneColRem + todoColRem}rem`,
    minWidth: `${milestoneColRem + todoColRem}rem`,
    left: milestoneLeft,
  };
  const getMemberColStyle = (index: number): CSSProperties => {
    const isLast = index === visibleMembers.length - 1;
    if (memberColsShouldStretch && isLast) {
      return { minWidth: memberCol };
    }
    return { width: memberCol, minWidth: memberCol };
  };

  const renderReadonlyMemberResponse = (
    item: TrackingItemRow,
    responseRow: TrackingItemMemberCompletionRow | null,
  ) => {
    const responseType = normalizeResponseType(item.response_type);
    if (responseType === "checkbox") {
      const completed = Boolean(responseRow?.is_completed);
      return (
        <div
          className={`mx-auto inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] leading-none ${
            completed
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-slate-300 bg-slate-100 text-slate-400"
          }`}
        >
          {completed ? "✓" : ""}
        </div>
      );
    }

    if (responseType === "number") {
      return (
        <p className="text-xs font-medium text-slate-700">
          {typeof responseRow?.number_value === "number"
            ? formatNumberValue(responseRow.number_value)
            : ""}
        </p>
      );
    }

    if (responseType === "date") {
      return <p className="text-xs font-medium text-slate-700">{formatDate(responseRow?.date_value ?? null)}</p>;
    }

    return <p className="text-xs font-medium text-slate-700">{responseRow?.select_value ?? ""}</p>;
  };

  const renderEditableMemberResponse = (
    item: TrackingItemRow,
    memberId: string,
    responseRow: TrackingItemMemberCompletionRow | null,
  ) => {
    const responseType = normalizeResponseType(item.response_type);

    if (responseType === "checkbox") {
      const completed = Boolean(responseRow?.is_completed);
      return (
        <form action={setTrackingItemMemberResponseAction} className="flex items-center justify-center">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="personId" value={memberId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="isCompleted" value={completed ? "false" : "true"} />
          <input type="hidden" name="numberValue" value="" />
          <input type="hidden" name="dateValue" value="" />
          <input type="hidden" name="selectValue" value="" />
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
      );
    }

    if (responseType === "number") {
      return (
        <AutoSubmitNumberResponseForm
          action={setTrackingItemMemberResponseAction}
          groupId={groupId}
          itemId={item.id}
          personId={memberId}
          returnTo={returnTo}
          defaultValue={
            typeof responseRow?.number_value === "number"
              ? responseRow.number_value.toString()
              : ""
          }
        />
      );
    }

    if (responseType === "date") {
      return (
        <AutoSubmitDateResponseForm
          action={setTrackingItemMemberResponseAction}
          groupId={groupId}
          itemId={item.id}
          personId={memberId}
          returnTo={returnTo}
          defaultValue={responseRow?.date_value ?? ""}
        />
      );
    }

    const options = Array.isArray(item.response_options) ? item.response_options : [];
    const currentValue = responseRow?.select_value ?? "";

    return (
      <AutoSubmitSelectResponseForm
        action={setTrackingItemMemberResponseAction}
        groupId={groupId}
        itemId={item.id}
        personId={memberId}
        returnTo={returnTo}
        options={options}
        defaultValue={currentValue}
      />
    );
  };

  const renderMemberResponseCell = (item: TrackingItemRow, memberId: string) => {
    const responseRow = responseByKey.get(buildCompletionKey(item.id, memberId)) ?? null;
    const canToggle = session.role === "coach" || currentMemberPersonId === memberId;
    if (!canToggle) {
      return renderReadonlyMemberResponse(item, responseRow);
    }
    return renderEditableMemberResponse(item, memberId, responseRow);
  };

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
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {visibleGroupSubsections.length}
            </p>
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
          <Link href="/groups" className="text-amber-700 underline">
            回到小組列表
          </Link>
        </div>
      </section>

      <GroupFeatureNavBar groupId={groupId} classId={group.class_id} current="tracking" />

      {(session.role === "coach" || session.role === "admin") && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">群發信</h2>
          <p className="mt-0.5 text-xs text-slate-500">發送訊息給小組內所有學員。</p>
          <form action={sendGroupEmailBlastAction} className="mt-3 space-y-2">
            <input type="hidden" name="groupId" value={groupId} />
            <input
              type="text"
              name="subject"
              placeholder="主旨"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <textarea
              name="body"
              placeholder="信件內容"
              rows={4}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
            >
              發送給全體學員
            </button>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">追蹤矩陣</h2>
        <p className="mt-1 text-sm text-slate-600">
          以里程碑與待辦事項為列、學員為欄，直接查看並回報每位學員完成狀態。
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="table-fixed w-full min-w-max border-collapse text-left text-sm">
            <colgroup>
              <col style={codeCellStyle} />
              <col style={milestoneCellStyle} />
              <col style={todoCellStyle} />
              {visibleMembers.map((member, index) => (
                <col key={`member-col-${member.id}`} style={getMemberColStyle(index)} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-emerald-100 text-slate-800">
                <th
                  className="xl:sticky z-40 border-b border-slate-300 bg-emerald-100 px-3 py-3"
                  style={stickyCodeCellStyle}
                >
                  編號
                </th>
                <th
                  className="xl:sticky z-40 border-b border-slate-300 bg-emerald-100 px-3 py-3"
                  style={stickyMilestoneCellStyle}
                >
                  里程碑
                </th>
                <th
                  className="xl:sticky z-40 border-b border-slate-300 bg-emerald-100 px-3 py-3 xl:shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]"
                  style={stickyTodoCellStyle}
                >
                  待辦事項
                </th>
                {visibleMembers.map((member) => (
                  <th
                    key={member.id}
                    className="min-w-[9rem] border-b border-slate-300 px-3 py-3 text-center"
                  >
                    <p className="font-semibold text-slate-900">
                      {member.display_name || member.full_name}
                    </p>
                    <p className="text-xs font-normal text-slate-600">{member.full_name}</p>
                  </th>
                ))}
              </tr>
              {!!visibleMembers.length && (
                <tr className="bg-emerald-50 text-xs text-slate-600">
                  <th
                    className="xl:sticky z-30 border-b border-slate-200 bg-emerald-50 px-3 py-2"
                    style={stickyCodeCellStyle}
                  >
                    
                  </th>
                  <th
                    className="xl:sticky z-30 border-b border-slate-200 bg-emerald-50 px-3 py-2"
                    style={stickyMilestoneCellStyle}
                  >
                    
                  </th>
                  <th
                    className="xl:sticky z-30 border-b border-slate-200 bg-emerald-50 px-3 py-2 xl:shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]"
                    style={stickyTodoCellStyle}
                  >
                    
                  </th>
                  {visibleMembers.map((member) => (
                    <th key={member.id} className="border-b border-slate-200 px-3 py-2 text-center">
                      {toPercent(completedItemCountByMember.get(member.id) ?? 0, groupItems.length).toFixed(
                        2,
                      )}
                      %
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {!groupSections.length && (
                <tr>
                  <td className="px-3 py-5 text-slate-500" colSpan={3 + visibleMembers.length}>
                    尚未建立追蹤大項。請先新增追蹤大項、小項與追蹤項目。
                  </td>
                </tr>
              )}

              {groupSections.map((section, sectionIndex) => {
                const sectionCode = String(sectionIndex);
                const subsectionRows = visibleSubsectionsBySectionId.get(section.id) ?? [];
                const directItems = directItemsBySectionId.get(section.id) ?? [];
                const sectionMilestonePercent = sectionMilestoneBasePercentById.get(section.id) ?? 0;

                return (
                  <Fragment key={section.id}>
                    <tr key={`${section.id}-summary`} className="bg-blue-700 text-white">
                      <td
                        className="xl:sticky z-20 border-b border-blue-900 bg-blue-700 px-3 py-2 font-semibold"
                        style={stickyCodeCellStyle}
                      >
                        {sectionCode}
                      </td>
                      <td
                        colSpan={2}
                        className="xl:sticky z-20 border-b border-blue-900 bg-blue-700 px-3 py-2 text-xs xl:shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]"
                        style={stickyMergedMilestoneTodoCellStyle}
                      >
                        <p className="font-semibold text-white">
                          {section.title} ({sectionMilestonePercent.toFixed(2)}%)
                        </p>
                        {section.description ? (
                          <p className="mt-1 text-xs text-blue-100">{section.description}</p>
                        ) : null}
                      </td>
                      {visibleMembers.map((member) => (
                        <td
                          key={`${section.id}:${member.id}:summary`}
                          className="border-b border-blue-900 px-2 py-2 text-center text-xs font-semibold"
                        >
                          
                        </td>
                      ))}
                    </tr>

                    {subsectionRows.map((subsection, subsectionIndex) => {
                      const subsectionCode = `${sectionCode}.${subsectionIndex + 1}`;

                      return (
                        <Fragment key={subsection.id}>
                          <tr key={`${subsection.id}-summary`} className="bg-violet-100 text-slate-800">
                            <td
                              className="xl:sticky z-20 border-b border-violet-200 bg-violet-100 px-3 py-2 font-semibold"
                              style={stickyCodeCellStyle}
                            >
                              {subsectionCode}
                            </td>
                            <td
                              colSpan={2}
                              className="xl:sticky z-20 border-b border-violet-200 bg-violet-100 px-3 py-2 text-xs xl:shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]"
                              style={stickyMergedMilestoneTodoCellStyle}
                            >
                              <p className="font-semibold text-slate-800">{subsection.title}</p>
                              {subsection.description ? (
                                <p className="mt-1 text-xs text-slate-600">{subsection.description}</p>
                              ) : null}
                            </td>
                            {visibleMembers.map((member) => (
                              <td
                                key={`${subsection.id}:${member.id}:summary`}
                                className="border-b border-violet-200 px-2 py-2 text-center text-xs font-semibold"
                              >
                                
                              </td>
                            ))}
                          </tr>

                          {(itemsBySubsectionId.get(subsection.id) ?? []).map((item, itemIndex) => {
                            const itemCode = `${subsectionCode}.${itemIndex + 1}`;
                            return (
                              <tr key={item.id} className="border-b border-slate-200 align-top">
                                <td
                                  className="xl:sticky z-10 bg-white px-3 py-2 font-semibold text-slate-700"
                                  style={stickyCodeCellStyle}
                                >
                                  {itemCode}
                                </td>
                                <td
                                  className="xl:sticky z-10 bg-white px-3 py-2 text-slate-500"
                                  style={stickyMilestoneCellStyle}
                                >
                                  {item.due_date ? (
                                    <p className="text-xs whitespace-nowrap">到期日：{formatDate(item.due_date)}</p>
                                  ) : null}
                                </td>
                                <td
                                  className="xl:sticky z-10 bg-white px-3 py-2 xl:shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]"
                                  style={stickyTodoCellStyle}
                                >
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
                                </td>

                                {visibleMembers.map((member) => (
                                  <td
                                    key={`${item.id}:${member.id}`}
                                    className="px-2 py-2 align-middle text-center"
                                  >
                                    {renderMemberResponseCell(item, member.id)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}

                          {!(itemsBySubsectionId.get(subsection.id) ?? []).length && (
                            <tr key={`${subsection.id}-empty`}>
                              <td
                                className="px-3 py-3 text-xs text-slate-500"
                                colSpan={3 + visibleMembers.length}
                              >
                                此小項尚未建立追蹤項目。
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}

                    {directItems.map((item, directItemIndex) => {
                      const itemCode = `${sectionCode}.${subsectionRows.length + directItemIndex + 1}`;
                      return (
                        <tr key={item.id} className="border-b border-slate-200 align-top">
                          <td
                            className="xl:sticky z-10 bg-white px-3 py-2 font-semibold text-slate-700"
                            style={stickyCodeCellStyle}
                          >
                            {itemCode}
                          </td>
                          <td
                            className="xl:sticky z-10 bg-white px-3 py-2 text-slate-500"
                            style={stickyMilestoneCellStyle}
                          >
                            {item.due_date ? (
                              <p className="text-xs whitespace-nowrap">到期日：{formatDate(item.due_date)}</p>
                            ) : null}
                          </td>
                          <td
                            className="xl:sticky z-10 bg-white px-3 py-2 xl:shadow-[6px_0_8px_-8px_rgba(15,23,42,0.45)]"
                            style={stickyTodoCellStyle}
                          >
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
                          </td>

                          {visibleMembers.map((member) => (
                            <td
                              key={`${item.id}:${member.id}`}
                              className="px-2 py-2 align-middle text-center"
                            >
                              {renderMemberResponseCell(item, member.id)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}

                    {!subsectionRows.length && !directItems.length && (
                      <tr key={`${section.id}-empty`}>
                        <td
                          className="px-3 py-3 text-xs text-slate-500"
                          colSpan={3 + visibleMembers.length}
                        >
                          此大項尚未建立追蹤小項或直接追蹤項目。
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


