import Link from "next/link";
import { StatusBanner } from "@/components/status-banner";
import { AuthShell } from "@/components/auth-shell";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  return (
    <AuthShell
      title="Sign in to PM-ABC"
      description="Choose your login role to continue."
    >
      <StatusBanner status={status} message={message} />
      <div className="grid gap-3">
        <Link
          href="/login/coach"
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
        >
          Coach login / register
        </Link>
        <Link
          href="/login/member"
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
        >
          Member login (Email OTP)
        </Link>
        <Link
          href="/login/admin"
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
        >
          Admin login
        </Link>
      </div>
    </AuthShell>
  );
}
