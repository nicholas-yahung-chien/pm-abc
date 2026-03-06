import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getDataLayerStatus } from "@/lib/repository";

export default function Home() {
  const dataLayer = getDataLayerStatus();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Dashboard
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          PMP 班別與小組管理
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          先完成 Phase 2 主資料：班別、小組、教練/學員、角色分派與通訊錄。
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Link
            href="/classes"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-300 hover:bg-amber-50"
          >
            <h3 className="font-semibold text-slate-900">班別管理</h3>
            <p className="mt-1 text-sm text-slate-600">
              建立班別代碼、名稱與開課區間。
            </p>
          </Link>

          <Link
            href="/directory"
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-300 hover:bg-amber-50"
          >
            <h3 className="font-semibold text-slate-900">通訊錄</h3>
            <p className="mt-1 text-sm text-slate-600">
              查看每個小組的教練與學員聯絡資訊。
            </p>
          </Link>
        </div>
      </section>

      <section
        className={`rounded-2xl border p-4 text-sm ${
          dataLayer.ok
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-amber-300 bg-amber-50 text-amber-900"
        }`}
      >
        <strong>資料層狀態：</strong> {dataLayer.message}
      </section>
    </AppShell>
  );
}
