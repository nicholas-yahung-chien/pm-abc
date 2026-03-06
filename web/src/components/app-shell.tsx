import Link from "next/link";

const navItems = [
  { href: "/classes", label: "班別管理" },
  { href: "/groups", label: "小組管理" },
  { href: "/people", label: "學員與教練" },
  { href: "/roles", label: "角色分派" },
  { href: "/directory", label: "通訊錄" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 md:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            PM-ABC
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            共好看板平台
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            班別 / 小組 / 成員 / 角色 / 通訊錄
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
      </aside>

      <main className="space-y-5">{children}</main>
    </div>
  );
}

