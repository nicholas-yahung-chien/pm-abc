import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createClassCourseChapterAction,
  createClassCourseItemAction,
  createClassCourseTopicAction,
  deleteClassCourseChapterAction,
  deleteClassCourseItemAction,
  deleteClassCourseTopicAction,
  moveClassCourseChapterAction,
  moveClassCourseItemAction,
  moveClassCourseTopicAction,
  updateClassCourseChapterAction,
  updateClassCourseItemAction,
  updateClassCourseTopicAction,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { ClassCourseManagementPanel } from "@/components/class-course-management-panel";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getClassById,
  listClassCourseChaptersByClassId,
  listClassCourseItemsByClassId,
  listClassCourseTopicsByClassId,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type Params = Promise<{ classId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClassCoursePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const encoded = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${encoded}`);
  }
  if (session.role === "member") {
    const encoded = encodeURIComponent("學員身份不可管理班別課程表。");
    redirect(`/groups?status=error&message=${encoded}`);
  }

  const { classId } = await params;
  const query = await searchParams;
  const status = pickSearchParam(query.status);
  const message = pickSearchParam(query.message);

  const classRow = await getClassById(classId);
  if (!classRow) {
    const encoded = encodeURIComponent("找不到指定班別。");
    redirect(`/classes?status=error&message=${encoded}`);
  }

  const [items, topics, chapters] = await Promise.all([
    listClassCourseItemsByClassId(classId),
    listClassCourseTopicsByClassId(classId),
    listClassCourseChaptersByClassId(classId),
  ]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          第三階段 / 課程表
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {classRow.code} / {classRow.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{classRow.description || "-"}</p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/classes" className="text-amber-700 underline">
            返回班別管理
          </Link>
          <Link href="/groups" className="text-amber-700 underline">
            前往小組管理
          </Link>
        </div>
      </section>

      <ClassCourseManagementPanel
        classId={classId}
        items={items}
        topics={topics}
        chapters={chapters}
        onCreateItemAction={createClassCourseItemAction}
        onUpdateItemAction={updateClassCourseItemAction}
        onDeleteItemAction={deleteClassCourseItemAction}
        onMoveItemAction={moveClassCourseItemAction}
        onCreateTopicAction={createClassCourseTopicAction}
        onUpdateTopicAction={updateClassCourseTopicAction}
        onDeleteTopicAction={deleteClassCourseTopicAction}
        onMoveTopicAction={moveClassCourseTopicAction}
        onCreateChapterAction={createClassCourseChapterAction}
        onUpdateChapterAction={updateClassCourseChapterAction}
        onDeleteChapterAction={deleteClassCourseChapterAction}
        onMoveChapterAction={moveClassCourseChapterAction}
      />
    </AppShell>
  );
}
