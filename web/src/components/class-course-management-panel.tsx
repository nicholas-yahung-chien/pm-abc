"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { FormModalTrigger } from "@/components/form-modal-trigger";
import type {
  ClassCourseChapterRow,
  ClassCourseItemRow,
  ClassCourseTopicRow,
} from "@/lib/types";

type ActionHandler = (formData: FormData) => void | Promise<void>;

type ClassCourseManagementPanelProps = {
  classId: string;
  items: ClassCourseItemRow[];
  topics: ClassCourseTopicRow[];
  chapters: ClassCourseChapterRow[];
  onCreateItemAction: ActionHandler;
  onUpdateItemAction: ActionHandler;
  onDeleteItemAction: ActionHandler;
  onMoveItemAction: ActionHandler;
  onCreateTopicAction: ActionHandler;
  onUpdateTopicAction: ActionHandler;
  onDeleteTopicAction: ActionHandler;
  onMoveTopicAction: ActionHandler;
  onCreateChapterAction: ActionHandler;
  onUpdateChapterAction: ActionHandler;
  onDeleteChapterAction: ActionHandler;
  onMoveChapterAction: ActionHandler;
};

function sortByOrder<T extends { sort_order: number; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

function normalizeColor(value: string): string {
  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : "#ffffff";
}

function formatDate(dateInput: string | null): string {
  if (!dateInput) return "未設定";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString("zh-TW");
}

function moveButtonClassName(): string {
  return "inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white p-0 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";
}

function iconButtonClassName(kind: "edit" | "delete"): string {
  if (kind === "delete") {
    return "btn-icon-delete";
  }
  return "btn-icon-edit";
}

export function ClassCourseManagementPanel({
  classId,
  items,
  topics,
  chapters,
  onCreateItemAction,
  onUpdateItemAction,
  onDeleteItemAction,
  onMoveItemAction,
  onCreateTopicAction,
  onUpdateTopicAction,
  onDeleteTopicAction,
  onMoveTopicAction,
  onCreateChapterAction,
  onUpdateChapterAction,
  onDeleteChapterAction,
  onMoveChapterAction,
}: ClassCourseManagementPanelProps) {
  const orderedItems = useMemo(() => sortByOrder(items), [items]);
  const orderedTopics = useMemo(() => sortByOrder(topics), [topics]);
  const orderedChapters = useMemo(() => sortByOrder(chapters), [chapters]);

  const topicsByItemId = useMemo(() => {
    const map = new Map<string, ClassCourseTopicRow[]>();
    for (const topic of orderedTopics) {
      const list = map.get(topic.class_course_item_id) ?? [];
      list.push(topic);
      map.set(topic.class_course_item_id, list);
    }
    return map;
  }, [orderedTopics]);

  const chaptersByTopicId = useMemo(() => {
    const map = new Map<string, ClassCourseChapterRow[]>();
    for (const chapter of orderedChapters) {
      const list = map.get(chapter.class_course_topic_id) ?? [];
      list.push(chapter);
      map.set(chapter.class_course_topic_id, list);
    }
    return map;
  }, [orderedChapters]);

  const itemOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    orderedItems.forEach((item, index) => map.set(item.id, index + 1));
    return map;
  }, [orderedItems]);

  const topicOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of orderedItems) {
      const rows = topicsByItemId.get(item.id) ?? [];
      rows.forEach((row, index) => map.set(row.id, index + 1));
    }
    return map;
  }, [orderedItems, topicsByItemId]);

  const chapterTopicOptions = useMemo(
    () =>
      orderedItems.flatMap((item) => {
        const itemOrder = itemOrderMap.get(item.id) ?? 0;
        const itemTopics = topicsByItemId.get(item.id) ?? [];
        return itemTopics.map((topic) => {
          const topicOrder = topicOrderMap.get(topic.id) ?? 0;
          return {
            id: topic.id,
            label: `課程 ${itemOrder} / 主題 ${itemOrder}.${topicOrder}：${topic.title}`,
          };
        });
      }),
    [orderedItems, itemOrderMap, topicsByItemId, topicOrderMap],
  );

  return (
    <section className="card-section">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">課程表管理</h2>
          <p className="mt-1 text-sm text-slate-600">
            以班別為單位管理課程項目、課程主題與章節，並可調整順序、顏色與內容。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <FormModalTrigger
            buttonLabel="新增課程項目"
            modalTitle="新增課程項目"
            modalDescription="新增一筆上課日期與授課講師資料。"
            submitLabel="新增課程項目"
            action={onCreateItemAction}
            formClassName="space-y-3"
          >
            <input type="hidden" name="classId" value={classId} />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">上課日期</span>
              <input type="date" name="courseDate" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">授課講師</span>
              <input name="instructorName" placeholder="例如：徐光明 / 未定" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">背景顏色</span>
              <input
                type="color"
                name="bgColor"
                defaultValue="#fca5a5"
                className="h-10 w-16 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
              />
            </label>
          </FormModalTrigger>

          <FormModalTrigger
            buttonLabel="新增課程主題"
            modalTitle="新增課程主題"
            modalDescription="新增主題到指定課程項目底下。"
            submitLabel="新增課程主題"
            action={onCreateTopicAction}
            formClassName="space-y-3"
            disabled={!orderedItems.length}
            triggerClassName="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
            submitClassName="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            <input type="hidden" name="classId" value={classId} />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">所屬課程項目 *</span>
              <select name="classCourseItemId" required defaultValue="">
                <option value="" disabled>
                  請選擇課程項目
                </option>
                {orderedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    課程 {itemOrderMap.get(item.id)} / {formatDate(item.course_date)} / {item.instructor_name || "未定"}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">主題標題 *</span>
              <input name="title" required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">背景顏色</span>
              <input
                type="color"
                name="bgColor"
                defaultValue="#fde68a"
                className="h-10 w-16 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
              />
            </label>
          </FormModalTrigger>

          <FormModalTrigger
            buttonLabel="新增章節"
            modalTitle="新增章節"
            modalDescription="新增章節到指定主題底下。"
            submitLabel="新增章節"
            action={onCreateChapterAction}
            formClassName="space-y-3"
            disabled={!chapterTopicOptions.length}
            triggerClassName="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            submitClassName="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <input type="hidden" name="classId" value={classId} />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">所屬課程主題 *</span>
              <select name="classCourseTopicId" required defaultValue="">
                <option value="" disabled>
                  請選擇課程主題
                </option>
                {chapterTopicOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">章節標題 *</span>
              <input name="title" required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">紙本頁碼</span>
              <input name="paperPage" placeholder="例如：1-33" />
            </label>
          </FormModalTrigger>
        </div>
      </div>

      {!orderedItems.length ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          尚未建立任何課程項目，請先點擊「新增課程項目」。
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {orderedItems.map((item, itemIndex) => {
            const itemTopics = topicsByItemId.get(item.id) ?? [];

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-4"
                style={{ backgroundColor: normalizeColor(item.bg_color) }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex shrink-0 flex-col gap-1">
                    <form action={onMoveItemAction}>
                      <input type="hidden" name="classId" value={classId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button title="上移" className={moveButtonClassName()} disabled={itemIndex === 0}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                    </form>
                    <form action={onMoveItemAction}>
                      <input type="hidden" name="classId" value={classId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        title="下移"
                        className={moveButtonClassName()}
                        disabled={itemIndex === orderedItems.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-700">
                      課程 {itemIndex + 1}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      上課日期：{formatDate(item.course_date)} / 授課講師：{item.instructor_name || "未定"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-start gap-2">
                    <FormModalTrigger
                      buttonLabel="編輯課程項目"
                      modalTitle="編輯課程項目"
                      submitLabel="儲存變更"
                      action={onUpdateItemAction}
                      triggerClassName={iconButtonClassName("edit")}
                      triggerContent={<Pencil className="h-4 w-4" />}
                    >
                      <input type="hidden" name="classId" value={classId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <label className="space-y-1">
                        <span className="text-sm font-medium text-slate-700">上課日期</span>
                        <input type="date" name="courseDate" defaultValue={item.course_date ?? ""} />
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm font-medium text-slate-700">授課講師</span>
                        <input name="instructorName" defaultValue={item.instructor_name} />
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm font-medium text-slate-700">背景顏色</span>
                        <input
                          type="color"
                          name="bgColor"
                          defaultValue={normalizeColor(item.bg_color)}
                          className="h-10 w-16 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                        />
                      </label>
                    </FormModalTrigger>

                    <form action={onDeleteItemAction}>
                      <input type="hidden" name="classId" value={classId} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button title="刪除課程項目" className={iconButtonClassName("delete")}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-l-2 border-white/70 pl-3">
                  {!itemTopics.length ? (
                    <p className="text-sm text-slate-700">此課程尚未建立主題。</p>
                  ) : (
                    itemTopics.map((topic, topicIndex) => {
                      const topicChapters = chaptersByTopicId.get(topic.id) ?? [];
                      const topicOrder = topicOrderMap.get(topic.id) ?? topicIndex + 1;

                      return (
                        <div
                          key={topic.id}
                          className="rounded-lg border border-slate-200 p-3"
                          style={{ backgroundColor: normalizeColor(topic.bg_color) }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex shrink-0 flex-col gap-1">
                              <form action={onMoveTopicAction}>
                                <input type="hidden" name="classId" value={classId} />
                                <input type="hidden" name="classCourseItemId" value={topic.class_course_item_id} />
                                <input type="hidden" name="topicId" value={topic.id} />
                                <input type="hidden" name="direction" value="up" />
                                <button title="上移" className={moveButtonClassName()} disabled={topicIndex === 0}>
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                              </form>
                              <form action={onMoveTopicAction}>
                                <input type="hidden" name="classId" value={classId} />
                                <input type="hidden" name="classCourseItemId" value={topic.class_course_item_id} />
                                <input type="hidden" name="topicId" value={topic.id} />
                                <input type="hidden" name="direction" value="down" />
                                <button
                                  title="下移"
                                  className={moveButtonClassName()}
                                  disabled={topicIndex === itemTopics.length - 1}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-700">
                                主題 {itemIndex + 1}.{topicOrder}
                              </p>
                              <p className="mt-1 font-semibold text-slate-900">{topic.title}</p>
                            </div>

                            <div className="flex shrink-0 items-start gap-2">
                              <FormModalTrigger
                                buttonLabel="編輯課程主題"
                                modalTitle="編輯課程主題"
                                submitLabel="儲存變更"
                                action={onUpdateTopicAction}
                                triggerClassName={iconButtonClassName("edit")}
                                triggerContent={<Pencil className="h-4 w-4" />}
                              >
                                <input type="hidden" name="classId" value={classId} />
                                <input type="hidden" name="topicId" value={topic.id} />
                                <input type="hidden" name="classCourseItemId" value={topic.class_course_item_id} />
                                <label className="space-y-1">
                                  <span className="text-sm font-medium text-slate-700">主題標題 *</span>
                                  <input name="title" defaultValue={topic.title} required />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-sm font-medium text-slate-700">背景顏色</span>
                                  <input
                                    type="color"
                                    name="bgColor"
                                    defaultValue={normalizeColor(topic.bg_color)}
                                    className="h-10 w-16 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                                  />
                                </label>
                              </FormModalTrigger>

                              <form action={onDeleteTopicAction}>
                                <input type="hidden" name="classId" value={classId} />
                                <input type="hidden" name="topicId" value={topic.id} />
                                <button title="刪除課程主題" className={iconButtonClassName("delete")}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </form>
                            </div>
                          </div>

                          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                  <th className="w-24 px-3 py-2">順序</th>
                                  <th className="px-3 py-2">章節標題</th>
                                  <th className="w-36 px-3 py-2">紙本頁碼</th>
                                  <th className="w-36 px-3 py-2 text-center">操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {!topicChapters.length && (
                                  <tr>
                                    <td colSpan={4} className="px-3 py-3 text-sm text-slate-500">
                                      此主題尚未建立章節。
                                    </td>
                                  </tr>
                                )}

                                {topicChapters.map((chapter, chapterIndex) => (
                                  <tr key={chapter.id} className="border-t border-slate-100">
                                    <td className="px-3 py-2 align-middle">
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col gap-1">
                                          <form action={onMoveChapterAction}>
                                            <input type="hidden" name="classId" value={classId} />
                                            <input type="hidden" name="classCourseTopicId" value={chapter.class_course_topic_id} />
                                            <input type="hidden" name="chapterId" value={chapter.id} />
                                            <input type="hidden" name="direction" value="up" />
                                            <button title="上移" className={moveButtonClassName()} disabled={chapterIndex === 0}>
                                              <ArrowUp className="h-3.5 w-3.5" />
                                            </button>
                                          </form>
                                          <form action={onMoveChapterAction}>
                                            <input type="hidden" name="classId" value={classId} />
                                            <input type="hidden" name="classCourseTopicId" value={chapter.class_course_topic_id} />
                                            <input type="hidden" name="chapterId" value={chapter.id} />
                                            <input type="hidden" name="direction" value="down" />
                                            <button
                                              title="下移"
                                              className={moveButtonClassName()}
                                              disabled={chapterIndex === topicChapters.length - 1}
                                            >
                                              <ArrowDown className="h-3.5 w-3.5" />
                                            </button>
                                          </form>
                                        </div>
                                        <span>{chapterIndex + 1}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 align-middle font-medium text-slate-900">{chapter.title}</td>
                                    <td className="px-3 py-2 align-middle text-slate-700">{chapter.paper_page || "-"}</td>
                                    <td className="px-3 py-2 align-middle">
                                      <div className="flex items-center justify-center gap-2">
                                        <FormModalTrigger
                                          buttonLabel="編輯章節"
                                          modalTitle="編輯章節"
                                          submitLabel="儲存變更"
                                          action={onUpdateChapterAction}
                                          triggerClassName={iconButtonClassName("edit")}
                                          triggerContent={<Pencil className="h-4 w-4" />}
                                        >
                                          <input type="hidden" name="classId" value={classId} />
                                          <input type="hidden" name="chapterId" value={chapter.id} />
                                          <input type="hidden" name="classCourseTopicId" value={chapter.class_course_topic_id} />
                                          <label className="space-y-1">
                                            <span className="text-sm font-medium text-slate-700">章節標題 *</span>
                                            <input name="title" defaultValue={chapter.title} required />
                                          </label>
                                          <label className="space-y-1">
                                            <span className="text-sm font-medium text-slate-700">紙本頁碼</span>
                                            <input name="paperPage" defaultValue={chapter.paper_page} />
                                          </label>
                                        </FormModalTrigger>

                                        <form action={onDeleteChapterAction}>
                                          <input type="hidden" name="classId" value={classId} />
                                          <input type="hidden" name="chapterId" value={chapter.id} />
                                          <button title="刪除章節" className={iconButtonClassName("delete")}>
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </form>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
