import Link from "next/link";
import { redirect } from "next/navigation";
import {
  copyTrackingItemAction,
  createTrackingItemAction,
  createTrackingSectionAction,
  createTrackingSubsectionAction,
  deleteTrackingItemAction,
  deleteTrackingSectionAction,
  deleteTrackingSubsectionAction,
  moveTrackingItemAction,
  toggleTrackingItemCompletionAction,
  updateTrackingItemAction,
  updateTrackingSectionAction,
  updateTrackingSubsectionAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listGroupTrackingProgress,
  listGroups,
  listMemberships,
  listMembershipsByEmail,
  listTrackingItems,
  listTrackingSectionProgress,
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
    groupProgressRows,
    sectionProgressRows,
  ] = await Promise.all([
    listGroups(),
    listMemberships(),
    session.role === "member" ? listMembershipsByEmail(session.email) : Promise.resolve([]),
    listTrackingSections(),
    listTrackingSubsections(),
    listTrackingItems(),
    listGroupTrackingProgress(),
    listTrackingSectionProgress(),
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
  const canManageStructure = session.role !== "member";

  const groupMembers = memberships
    .filter((item) => item.group_id === groupId && item.membership_type === "member")
    .map((item) => item.person)
    .filter((person): person is NonNullable<typeof person> => Boolean(person));

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

  const sectionProgressById = new Map(
    sectionProgressRows
      .filter((item) => item.group_id === groupId)
      .map((item) => [item.section_id, item]),
  );

  const groupProgress = groupProgressRows.find((item) => item.group_id === groupId);

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
              {Number(groupProgress?.completion_percent ?? 0).toFixed(2)}%
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

      {canManageStructure ? (
        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">新增追蹤大項</h2>
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
            <h2 className="text-lg font-semibold text-slate-900">新增追蹤小項</h2>
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
              <button
                disabled={!groupSections.length}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                新增小項
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">新增追蹤項目</h2>
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
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">負責學員</span>
                <select name="ownerPersonId" defaultValue="">
                  <option value="">未指定</option>
                  {groupMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.display_name || member.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="extraData" value="" />
              <input type="hidden" name="externalUrl" value="" />
              <input type="hidden" name="progressPercent" value="0" />
              <input type="hidden" name="isCompleted" value="false" />
              <button
                disabled={!groupSubsections.length}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                新增追蹤項目
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">學員回報規則</h2>
          <p className="mt-2 text-sm text-slate-600">
            學員可在下方追蹤項目回報是否完成；追蹤結構與內容由教練或管理員維護。
          </p>
        </section>
      )}

      <section className="space-y-4">
        {!groupSections.length && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            目前尚無追蹤大項。請先建立追蹤大項與小項後，再新增追蹤項目。
          </div>
        )}

        {groupSections.map((section) => {
          const sectionProgress = sectionProgressById.get(section.id);
          const subsectionRows = groupSubsections.filter((item) => item.section_id === section.id);

          return (
            <article key={section.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {section.description || "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  大項完成率 {Number(sectionProgress?.completion_percent ?? 0).toFixed(2)}%
                </div>
              </div>

              {canManageStructure && (
                <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <form action={updateTrackingSectionAction} className="grid grow gap-2 md:grid-cols-3">
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input name="title" defaultValue={section.title} required />
                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      step={10}
                      defaultValue={section.sort_order}
                      required
                    />
                    <textarea name="description" rows={2} defaultValue={section.description} />
                    <div className="md:col-span-3">
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
              )}

              <div className="mt-4 space-y-4">
                {subsectionRows.map((subsection) => {
                  const items = itemsBySubsectionId.get(subsection.id) ?? [];

                  return (
                    <div key={subsection.id} className="rounded-xl border border-slate-200 p-4">
                      <h3 className="text-lg font-semibold text-slate-900">{subsection.title}</h3>

                      {canManageStructure && (
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
                            <input
                              name="sortOrder"
                              type="number"
                              min={0}
                              step={10}
                              defaultValue={subsection.sort_order}
                              required
                            />
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
                      )}

                      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-3 py-2">項目</th>
                              <th className="px-3 py-2">到期日</th>
                              <th className="px-3 py-2">負責學員</th>
                              <th className="px-3 py-2">進度</th>
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
                                <td className="px-3 py-2 text-xs text-slate-700">{formatDate(item.due_date)}</td>
                                <td className="px-3 py-2 text-xs text-slate-700">
                                  {item.owner?.display_name || item.owner?.full_name || "-"}
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-700">{item.progress_percent}%</td>
                                <td className="px-3 py-2">
                                  <form action={toggleTrackingItemCompletionAction}>
                                    <input type="hidden" name="groupId" value={groupId} />
                                    <input type="hidden" name="itemId" value={item.id} />
                                    <input type="hidden" name="returnTo" value={returnTo} />
                                    <input
                                      type="hidden"
                                      name="isCompleted"
                                      value={item.is_completed ? "false" : "true"}
                                    />
                                    <button
                                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                        item.is_completed
                                          ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                                      }`}
                                    >
                                      {item.is_completed ? "標記未完成" : "標記完成"}
                                    </button>
                                  </form>

                                  {canManageStructure && (
                                    <details className="mt-2">
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
                                          <select name="ownerPersonId" defaultValue={item.owner_person_id || ""}>
                                            <option value="">未指定</option>
                                            {groupMembers.map((member) => (
                                              <option key={member.id} value={member.id}>
                                                {member.display_name || member.full_name}
                                              </option>
                                            ))}
                                          </select>
                                          <input
                                            name="progressPercent"
                                            type="number"
                                            min={0}
                                            max={100}
                                            defaultValue={item.progress_percent}
                                            required
                                          />
                                          <select name="isCompleted" defaultValue={item.is_completed ? "true" : "false"}>
                                            <option value="false">未完成</option>
                                            <option value="true">已完成</option>
                                          </select>
                                          <input
                                            name="sortOrder"
                                            type="number"
                                            min={0}
                                            step={10}
                                            defaultValue={item.sort_order}
                                            required
                                          />
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
                                  )}
                                </td>
                              </tr>
                            ))}

                            {!items.length && (
                              <tr>
                                <td className="px-3 py-4 text-slate-500" colSpan={5}>
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
    </AppShell>
  );
}
