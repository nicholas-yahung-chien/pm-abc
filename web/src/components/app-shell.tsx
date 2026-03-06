import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";
import { getCurrentSession } from "@/lib/auth/session";

const baseNavItems = [
  { href: "/dashboard", label: "總覽" },
  { href: "/account", label: "帳號設定" },
  { href: "/classes", label: "班別管理" },
  { href: "/groups", label: "小組管理" },
  { href: "/people", label: "人員管理" },
  { href: "/roles", label: "R&R 角色" },
  { href: "/directory", label: "通訊錄" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    const message = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${message}`);
  }

  const navItems =
    session.role === "admin"
      ? [
          ...baseNavItems,
          { href: "/admin/coach-approvals", label: "教練審核中心" },
        ]
      : baseNavItems;

  const roleLabel =
    session.role === "admin" ? "管理員" : session.role === "coach" ? "教練" : "學員";

  return (
    <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 md:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            PM-ABC
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">共好看板平台</h1>
          <p className="mt-1 text-sm text-slate-600">
            {session.displayName || session.email}（{roleLabel}）
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={logoutAction} className="mt-6">
          <button className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700">
            登出
          </button>
        </form>
      </aside>

      <main className="space-y-5">{children}</main>
    </div>
  );
}
