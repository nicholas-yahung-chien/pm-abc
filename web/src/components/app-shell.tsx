import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";
import { getCurrentSession } from "@/lib/auth/session";

const coachNavItems = [
  { href: "/dashboard", label: "總覽" },
  { href: "/account", label: "帳號設定" },
  { href: "/classes", label: "班別管理" },
  { href: "/groups", label: "小組管理" },
  { href: "/people", label: "學員管理" },
];

const memberNavItems = [
  { href: "/dashboard", label: "總覽" },
  { href: "/account", label: "帳號設定" },
  { href: "/groups", label: "我的小組" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    const message = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${message}`);
  }

  const navItems =
    session.role === "member"
      ? memberNavItems
      : session.role === "admin"
        ? [
            ...coachNavItems,
            { href: "/admin/coach-approvals", label: "教練審核中心" },
            { href: "/admin/notifications", label: "通知記錄" },
          ]
        : coachNavItems;

  const roleLabel =
    session.role === "admin" ? "管理員" : session.role === "coach" ? "教練" : "學員";

  return (
    <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 md:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl bg-[#1e2d40] p-5 md:self-start md:sticky md:top-6">
        <div className="mb-5 border-b border-white/10 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
            PM-ABC
          </p>
          <h1 className="mt-1.5 text-base font-semibold text-white">共好看板平台</h1>
          <p className="mt-1 text-xs text-slate-400">
            {session.displayName || session.email}（{roleLabel}）
          </p>
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors duration-100 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 border-t border-white/10 pt-5">
          <form action={logoutAction}>
            <button className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-400 transition-colors duration-100 hover:bg-white/10 hover:text-rose-300">
              登出
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 space-y-5">{children}</main>
    </div>
  );
}
