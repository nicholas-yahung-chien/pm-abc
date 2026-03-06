import { redirect } from "next/navigation";
import {
  changeMyPasswordAction,
  updateAccountProfileAction,
  updateCoachDirectoryProfileAction,
} from "@/app/auth-actions";
import { AppShell } from "@/components/app-shell";
import { StatusBanner } from "@/components/status-banner";
import { getCoachDirectoryProfileByEmail } from "@/lib/auth/repository";
import { getCurrentSession } from "@/lib/auth/session";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const message = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${message}`);
  }

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);
  const coachProfileResult =
    session.role === "coach"
      ? await getCoachDirectoryProfileByEmail(session.email)
      : null;
  const coachProfile = coachProfileResult?.ok ? coachProfileResult.data : null;

  const roleLabel =
    session.role === "admin" ? "管理員" : session.role === "coach" ? "教練" : "學員";

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          帳號設定
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">基本資料</h2>
        <p className="mt-1 text-sm text-slate-600">
          可更新顯示名稱與檢視目前帳號資訊。
        </p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <form action={updateAccountProfileAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">顯示名稱</span>
            <input name="displayName" defaultValue={session.displayName} required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">身份</span>
            <input value={roleLabel} readOnly disabled />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">登入帳號</span>
            <input value={session.email} readOnly disabled />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
              儲存基本資料
            </button>
          </div>
        </form>
      </section>

      {session.role === "coach" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">教練通訊錄資料</h3>
          <p className="mt-1 text-sm text-slate-600">
            以下資料將顯示於小組通訊錄，提供學員查看。
          </p>

          <form
            action={updateCoachDirectoryProfileAction}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">姓名 *</span>
              <input
                name="fullName"
                defaultValue={coachProfile?.fullName || session.displayName}
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">
                希望別人怎麼稱呼
              </span>
              <input
                name="displayName"
                defaultValue={coachProfile?.displayName || session.displayName}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">LINE ID</span>
              <input name="lineId" defaultValue={coachProfile?.lineId || ""} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">聯絡電話</span>
              <input name="phone" defaultValue={coachProfile?.phone || ""} />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                電子信箱（登入帳號）
              </span>
              <input value={coachProfile?.email || session.email} readOnly disabled />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">自我介紹</span>
              <textarea name="intro" rows={6} defaultValue={coachProfile?.intro || ""} />
            </label>

            <div className="md:col-span-2">
              <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
                儲存通訊錄資料
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">密碼設定</h3>
        {session.role === "member" ? (
          <p className="mt-2 text-sm text-slate-600">
            學員帳號採 Email OTP 登入，不需要密碼。
          </p>
        ) : (
          <form action={changeMyPasswordAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">目前密碼</span>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">新密碼</span>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">確認新密碼</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <div className="md:col-span-2">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-amber-300 hover:bg-amber-50">
                更新密碼
              </button>
            </div>
          </form>
        )}
      </section>
    </AppShell>
  );
}
