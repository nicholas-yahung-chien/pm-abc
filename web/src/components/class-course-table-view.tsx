import type {
  ClassCourseChapterRow,
  ClassCourseItemRow,
  ClassCourseTopicRow,
} from "@/lib/types";
import type { ReactNode } from "react";

type ClassCourseTableViewProps = {
  items: ClassCourseItemRow[];
  topics: ClassCourseTopicRow[];
  chapters: ClassCourseChapterRow[];
  emptyText?: string;
};

type TopicRenderBlock = {
  topic: ClassCourseTopicRow | null;
  chapters: (ClassCourseChapterRow | null)[];
  rowCount: number;
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

function formatDateWithWeekday(dateInput: string | null): string {
  if (!dateInput) return "\u672a\u8a2d\u5b9a";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  const dateText = date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekday = date.toLocaleDateString("zh-TW", { weekday: "short" });
  return `${dateText}\uff08${weekday}\uff09`;
}

export function ClassCourseTableView({
  items,
  topics,
  chapters,
  emptyText = "\u5c1a\u672a\u5efa\u7acb\u8ab2\u7a0b\u8cc7\u6599\u3002",
}: ClassCourseTableViewProps) {
  const orderedItems = sortByOrder(items);
  const orderedTopics = sortByOrder(topics);
  const orderedChapters = sortByOrder(chapters);

  const topicsByItemId = new Map<string, ClassCourseTopicRow[]>();
  for (const topic of orderedTopics) {
    const list = topicsByItemId.get(topic.class_course_item_id) ?? [];
    list.push(topic);
    topicsByItemId.set(topic.class_course_item_id, list);
  }

  const chaptersByTopicId = new Map<string, ClassCourseChapterRow[]>();
  for (const chapter of orderedChapters) {
    const list = chaptersByTopicId.get(chapter.class_course_topic_id) ?? [];
    list.push(chapter);
    chaptersByTopicId.set(chapter.class_course_topic_id, list);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full table-auto border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[1%]" />
          <col className="w-[1%]" />
          <col className="w-[1%]" />
          <col className="w-[1%]" />
          <col />
          <col className="w-[1%]" />
        </colgroup>
        <thead>
          <tr className="bg-violet-50 text-slate-900">
            <th className="w-[1%] whitespace-nowrap border border-slate-800 px-2 py-2 text-center font-semibold">
              {"\u9806\u5e8f"}
            </th>
            <th className="w-[1%] whitespace-nowrap border border-slate-800 px-2 py-2 text-center font-semibold">
              {"\u4e0a\u8ab2\u65e5\u671f"}
            </th>
            <th className="w-[1%] whitespace-nowrap border border-slate-800 px-2 py-2 text-center font-semibold">
              {"\u6388\u8ab2\u8b1b\u5e2b"}
            </th>
            <th className="w-[1%] whitespace-nowrap border border-slate-800 px-3 py-2 text-center font-semibold">
              {"\u4e3b\u984c"}
            </th>
            <th className="border border-slate-800 px-3 py-2 text-center font-semibold">
              {"\u7ae0\u7bc0\u6a19\u984c"}
            </th>
            <th className="w-[1%] whitespace-nowrap border border-slate-800 px-3 py-2 text-center font-semibold">
              {"\u7d19\u672c\u9801\u78bc"}
            </th>
          </tr>
        </thead>
        <tbody>
          {!orderedItems.length && (
            <tr>
              <td
                className="border border-slate-300 px-3 py-5 text-center text-slate-500"
                colSpan={6}
              >
                {emptyText}
              </td>
            </tr>
          )}

          {orderedItems.flatMap((item, itemIndex) => {
            const itemTopics = topicsByItemId.get(item.id) ?? [];
            const topicBlocks: TopicRenderBlock[] =
              itemTopics.length > 0
                ? itemTopics.map((topic) => {
                    const topicChapters = chaptersByTopicId.get(topic.id) ?? [];
                    return {
                      topic,
                      chapters: topicChapters.length > 0 ? topicChapters : [null],
                      rowCount: Math.max(topicChapters.length, 1),
                    };
                  })
                : [{ topic: null, chapters: [null], rowCount: 1 }];

            const itemRowCount = topicBlocks.reduce((sum, block) => sum + block.rowCount, 0);
            const itemBg = normalizeColor(item.bg_color);

            const rows: ReactNode[] = [];
            let itemCellRendered = false;

            for (const block of topicBlocks) {
              const topicBg = normalizeColor(block.topic?.bg_color ?? itemBg);
              for (let chapterIndex = 0; chapterIndex < block.chapters.length; chapterIndex += 1) {
                const chapter = block.chapters[chapterIndex];
                const rowKey = `${item.id}:${block.topic?.id ?? "default"}:${chapter?.id ?? "empty"}:${chapterIndex}`;

                rows.push(
                  <tr key={rowKey}>
                    {!itemCellRendered && (
                      <>
                        <td
                          rowSpan={itemRowCount}
                          className="w-[1%] whitespace-nowrap border border-slate-700 px-2 py-2 text-center align-middle text-base font-semibold text-slate-900"
                          style={{ backgroundColor: itemBg }}
                        >
                          {itemIndex + 1}
                        </td>
                        <td
                          rowSpan={itemRowCount}
                          className="w-[1%] whitespace-nowrap border border-slate-700 px-2 py-2 text-center align-middle text-sm font-semibold text-slate-900"
                          style={{ backgroundColor: itemBg }}
                        >
                          {formatDateWithWeekday(item.course_date)}
                        </td>
                        <td
                          rowSpan={itemRowCount}
                          className="w-[1%] whitespace-nowrap border border-slate-700 px-2 py-2 text-center align-middle text-base font-semibold text-slate-900"
                          style={{ backgroundColor: itemBg }}
                        >
                          {item.instructor_name || "\u672a\u5b9a"}
                        </td>
                      </>
                    )}

                    {chapterIndex === 0 && (
                      <td
                        rowSpan={block.rowCount}
                        className="w-[1%] whitespace-nowrap border border-slate-700 px-3 py-2 align-middle text-center text-xl font-semibold text-slate-900"
                        style={{ backgroundColor: topicBg }}
                      >
                        {block.topic?.title ?? ""}
                      </td>
                    )}

                    <td className="border border-slate-700 px-2 py-2 align-middle text-sm text-slate-900 break-words">
                      {chapter?.title ?? ""}
                    </td>
                    <td className="w-[1%] whitespace-nowrap border border-slate-700 px-2 py-2 text-center align-middle text-sm text-slate-900">
                      {chapter?.paper_page ?? ""}
                    </td>
                  </tr>,
                );

                itemCellRendered = true;
              }
            }

            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}
