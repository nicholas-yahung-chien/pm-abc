import Link from "next/link";
import { redirect } from "next/navigation";
import { createGroupAction, createMembershipAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listClasses,
  listGroups,
  listMemberships,
  listMembershipsByEmail,
  listPeople,
} from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const encoded = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${encoded}`);
  }

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  if (session.role === "member") {
    const [allGroups, memberMemberships] = await Promise.all([
      listGroups(),
      listMembershipsByEmail(session.email),
    ]);

    const memberGroupIds = new Set(memberMemberships.map((item) => item.group_id));
    const groups = allGroups.filter((item) => memberGroupIds.has(item.id));

    return (
      <AppShell>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            第二階段 / 我的小組
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">我的小組列表</h2>
          <p className="mt-1 text-sm text-slate-600">
            學員僅可進入已被指派的小組，並在小組內進行管理與協作。
          </p>

          <div className="mt-4">
            <StatusBanner status={status} message={message} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">小組列表</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">班別</th>
                  <th className="px-3 py-2">小組代碼</th>
                  <th className="px-3 py-2">小組名稱</th>
                  <th className="px-3 py-2">說明</th>
                  <th className="px-3 py-2">入口</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.class?.code ?? "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2">{item.description || "-"}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/groups/${item.id}`}
                        className="text-sm font-semibold text-amber-700 underline"
                      >
                        進入小組
                      </Link>
                    </td>
                  </tr>
                ))}
                {!groups.length && (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={5}>
                      目前尚未被指派到任何小組。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </AppShell>
    );
  }

  const [classes, groups, people, memberships] = await Promise.all([
    listClasses(),
    listGroups(),
    listPeople(),
    listMemberships(),
  ]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          第二階段 / 小組管理
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">建立小組</h2>
        <p className="mt-1 text-sm text-slate-600">
          在班別底下建立小組，並由小組入口進行組內功能管理。
        </p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <form action={createGroupAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">所屬班別 *</span>
            <select name="classId" required defaultValue="">
              <option value="" disabled>
                請選擇班別
              </option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} / {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">小組代碼 *</span>
            <input name="code" placeholder="例如：G1" required />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">小組名稱 *</span>
            <input name="name" placeholder="例如：共好學習組" required />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">說明</span>
            <textarea name="description" rows={3} placeholder="小組補充資訊" />
          </label>

          <div className="md:col-span-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              新增小組
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">小組成員指派</h3>
        <form
          action={createMembershipAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">小組 *</span>
            <select name="groupId" required defaultValue="">
              <option value="" disabled>
                請選擇小組
              </option>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class?.code ?? "N/A"} / {item.code} {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">學員 *</span>
            <select name="personId" required defaultValue="">
              <option value="" disabled>
                請選擇學員
              </option>
              {people.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}（{item.person_type === "coach" ? "教練" : "學員"}）
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">成員類型 *</span>
            <select name="membershipType" required defaultValue="member">
              <option value="member">學員</option>
              <option value="coach">教練</option>
            </select>
          </label>

          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <input type="checkbox" name="isLeader" className="h-4 w-4" />
            設為小組長
          </label>

          <div className="md:col-span-4">
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
              新增成員指派
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">小組列表</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">班別</th>
                <th className="px-3 py-2">小組代碼</th>
                <th className="px-3 py-2">小組名稱</th>
                <th className="px-3 py-2">說明</th>
                <th className="px-3 py-2">管理入口</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{item.class?.code ?? "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2">{item.description || "-"}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/groups/${item.id}`}
                      className="text-sm font-semibold text-amber-700 underline"
                    >
                      進入小組
                    </Link>
                  </td>
                </tr>
              ))}
              {!groups.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={5}>
                    目前尚無小組資料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">小組成員列表</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">小組</th>
                <th className="px-3 py-2">學員</th>
                <th className="px-3 py-2">成員類型</th>
                <th className="px-3 py-2">小組長</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {item.group?.code} {item.group?.name}
                  </td>
                  <td className="px-3 py-2">
                    {item.person?.display_name || item.person?.full_name || "-"}
                  </td>
                  <td className="px-3 py-2">
                    {item.membership_type === "coach" ? "教練" : "學員"}
                  </td>
                  <td className="px-3 py-2">{item.is_leader ? "是" : "否"}</td>
                </tr>
              ))}
              {!memberships.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    目前尚無成員指派資料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
