import { redirect } from "next/navigation";
import {
  approveCoachAction,
  createCoachByAdminAction,
  deleteCoachByAdminAction,
  rejectCoachAction,
  updateAdminNotificationEmailAction,
} from "@/app/auth-actions";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getAdminNotificationEmail,
  listCoachAccounts,
  listPendingCoachAccounts,
} from "@/lib/auth/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CoachApprovalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login/admin?status=error&message=Please%20sign%20in%20first.");
  if (session.role !== "admin") {
    redirect("/dashboard?status=error&message=Admin%20access%20is%20required.");
  }

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  const [pendingResult, allCoachesResult, notificationEmailResult] =
    await Promise.all([
      listPendingCoachAccounts(),
      listCoachAccounts(),
      getAdminNotificationEmail(),
    ]);

  const pendingCoaches = pendingResult.ok ? pendingResult.data : [];
  const coachAccounts = allCoachesResult.ok ? allCoachesResult.data : [];
  const notificationEmail = notificationEmailResult.ok
    ? (notificationEmailResult.data ?? "")
    : "";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-5 px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Coach registration review
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Review pending coach requests and manage coach accounts.
        </p>
        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Admin notification email
        </h2>
        <form action={updateAdminNotificationEmailAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            name="notificationEmail"
            type="email"
            required
            defaultValue={notificationEmail}
            placeholder="admin@example.com"
          />
          <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
            Save
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Pending approvals</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingCoaches.map((account) => (
                <tr key={account.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{account.display_name || "-"}</td>
                  <td className="px-3 py-2">{account.email}</td>
                  <td className="px-3 py-2">{account.created_at}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <form action={approveCoachAction}>
                        <input type="hidden" name="accountId" value={account.id} />
                        <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                          Approve
                        </button>
                      </form>
                      <form action={rejectCoachAction}>
                        <input type="hidden" name="accountId" value={account.id} />
                        <button className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">
                          Reject
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!pendingCoaches.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    No pending coach applications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Create or reset coach account
        </h2>
        <form action={createCoachByAdminAction} className="mt-3 grid gap-3 md:grid-cols-3">
          <input name="displayName" placeholder="Coach display name" required />
          <input name="email" type="email" placeholder="coach@example.com" required />
          <input name="password" type="password" minLength={8} required />
          <button className="md:col-span-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
            Save coach account
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">All coach accounts</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last login</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {coachAccounts.map((account) => (
                <tr key={account.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{account.display_name || "-"}</td>
                  <td className="px-3 py-2">{account.email}</td>
                  <td className="px-3 py-2">{account.coach_status}</td>
                  <td className="px-3 py-2">{account.last_login_at ?? "-"}</td>
                  <td className="px-3 py-2">
                    <form action={deleteCoachByAdminAction}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <button className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!coachAccounts.length && (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={5}>
                    No coach accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
