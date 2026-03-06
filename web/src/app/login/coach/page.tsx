import Link from "next/link";
import { coachLoginAction, coachRegisterAction } from "@/app/auth-actions";
import { AuthShell } from "@/components/auth-shell";
import { StatusBanner } from "@/components/status-banner";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CoachLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  return (
    <AuthShell
      title="Coach login / register"
      description="Coach registration requires admin approval before first login."
    >
      <StatusBanner status={status} message={message} />

      <section className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Coach login</h2>
        <form action={coachLoginAction} className="space-y-3">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
            Sign in as coach
          </button>
        </form>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Coach registration
        </h2>
        <form action={coachRegisterAction} className="space-y-3">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input name="displayName" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-amber-300 hover:bg-amber-50">
            Submit application
          </button>
        </form>
      </section>

      <Link href="/login" className="text-sm text-slate-600 underline">
        Back to role selection
      </Link>
    </AuthShell>
  );
}
