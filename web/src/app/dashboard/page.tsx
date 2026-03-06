import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?status=error&message=Please%20sign%20in%20first.");

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  const commonLinks = [
    { href: "/classes", label: "Classes" },
    { href: "/groups", label: "Groups" },
    { href: "/people", label: "People" },
    { href: "/roles", label: "R&R Roles" },
    { href: "/directory", label: "Directory" },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              PM-ABC
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Welcome, {session.displayName || session.email}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as <strong>{session.role}</strong> ({session.email})
            </p>
          </div>

          <form action={logoutAction}>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700">
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {commonLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
          >
            {item.label}
          </Link>
        ))}

        {session.role === "admin" && (
          <Link
            href="/admin/coach-approvals"
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
          >
            Coach approvals
          </Link>
        )}
      </section>
    </main>
  );
}
