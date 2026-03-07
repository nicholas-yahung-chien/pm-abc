import {
  batchDeleteMemberAccountsAction,
  createMemberAccountAction,
  deleteMemberAccountAction,
  updateMemberAccountAction,
} from "@/app/actions";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FormModalTrigger } from "@/components/form-modal-trigger";
import { MemberManagementTable } from "@/components/member-management-table";
import { StatusBanner } from "@/components/status-banner";
import { getCurrentSession } from "@/lib/auth/session";
import { listMembers } from "@/lib/repository";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();
  if (!session) {
    const encoded = encodeURIComponent("請先登入後再繼續使用。");
    redirect(`/login?status=error&message=${encoded}`);
  }
  if (session.role === "member") {
    const encoded = encodeURIComponent("學員身份不可管理學員資料。");
    redirect(`/groups?status=error&message=${encoded}`);
  }

  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);
  const members = await listMembers();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          第二階段 / 學員管理
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">新增學員帳號</h2>
        <p className="mt-1 text-sm text-slate-600">
          此頁只管理學員帳號、編號與姓名。LINE ID、稱呼、自我介紹由學員在小組通訊錄自行編輯。
        </p>

        <div className="mt-4">
          <StatusBanner status={status} message={message} />
        </div>

        <div className="mt-4">
          <FormModalTrigger
            buttonLabel="新增學員帳號"
            modalTitle="新增學員帳號"
            modalDescription="僅需輸入學員 Email 建立帳號，其他通訊錄資料由學員在小組通訊錄維護。"
            submitLabel="新增學員帳號"
            action={createMemberAccountAction}
            formClassName="space-y-3"
          >
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">學員 Email *</span>
              <input
                name="email"
                type="email"
                placeholder="member@example.com"
                required
              />
            </label>
          </FormModalTrigger>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">學員管理清單</h3>
        <p className="mt-1 text-sm text-slate-600">
          可修改學員編號、姓名、Email，或刪除學員。新增完成後即可到小組管理進行成員指派。
        </p>

        <MemberManagementTable
          members={members.map((item) => ({
            id: item.id,
            personNo: item.person_no || "",
            fullName: item.full_name || "",
            email: item.email || "",
          }))}
          onUpdateAction={updateMemberAccountAction}
          onDeleteAction={deleteMemberAccountAction}
          onBatchDeleteAction={batchDeleteMemberAccountsAction}
        />
      </section>
    </AppShell>
  );
}
