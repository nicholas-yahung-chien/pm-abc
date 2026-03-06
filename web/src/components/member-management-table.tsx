"use client";

import { useMemo, useState } from "react";

type MemberListItem = {
  id: string;
  personNo: string;
  fullName: string;
  email: string;
};

type MemberManagementTableProps = {
  members: MemberListItem[];
  onUpdateAction: (formData: FormData) => void | Promise<void>;
  onDeleteAction: (formData: FormData) => void | Promise<void>;
};

export function MemberManagementTable({
  members,
  onUpdateAction,
  onDeleteAction,
}: MemberManagementTableProps) {
  const memberById = useMemo(
    () => new Map(members.map((item) => [item.id, item])),
    [members],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { personNo: string; fullName: string; email: string }>
  >({});

  const startEdit = (memberId: string) => {
    const source = memberById.get(memberId);
    if (!source) return;
    setDrafts((prev) => ({
      ...prev,
      [memberId]: {
        personNo: source.personNo,
        fullName: source.fullName,
        email: source.email,
      },
    }));
    setEditingId(memberId);
  };

  const cancelEdit = (memberId: string) => {
    const source = memberById.get(memberId);
    if (!source) {
      setEditingId(null);
      return;
    }
    setDrafts((prev) => ({
      ...prev,
      [memberId]: {
        personNo: source.personNo,
        fullName: source.fullName,
        email: source.email,
      },
    }));
    setEditingId(null);
  };

  const updateDraft = (
    memberId: string,
    field: "personNo" | "fullName" | "email",
    value: string,
  ) => {
    const source = memberById.get(memberId);
    setDrafts((prev) => {
      const base = prev[memberId] ?? {
        personNo: source?.personNo ?? "",
        fullName: source?.fullName ?? "",
        email: source?.email ?? "",
      };
      return {
        ...prev,
        [memberId]: { ...base, [field]: value },
      };
    });
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2">學員編號</th>
            <th className="px-3 py-2">學員姓名</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map((item) => {
            const isEditing = editingId === item.id;
            const formId = `member-update-${item.id}`;
            const draft = drafts[item.id] ?? {
              personNo: item.personNo,
              fullName: item.fullName,
              email: item.email,
            };

            return (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {isEditing ? (
                    <input
                      form={formId}
                      name="personNo"
                      value={draft.personNo}
                      onChange={(event) =>
                        updateDraft(item.id, "personNo", event.currentTarget.value)
                      }
                      placeholder="例如 2508"
                      className="min-w-24"
                    />
                  ) : (
                    <span className="font-mono text-xs">{item.personNo || "-"}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <input
                      form={formId}
                      name="fullName"
                      value={draft.fullName}
                      onChange={(event) =>
                        updateDraft(item.id, "fullName", event.currentTarget.value)
                      }
                      placeholder="請輸入學員姓名"
                      required
                      className="min-w-32"
                    />
                  ) : (
                    item.fullName || "-"
                  )}
                </td>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <input
                      form={formId}
                      name="email"
                      type="email"
                      value={draft.email}
                      onChange={(event) =>
                        updateDraft(item.id, "email", event.currentTarget.value)
                      }
                      required
                      className="min-w-64"
                    />
                  ) : (
                    item.email || "-"
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <form id={formId} action={onUpdateAction}>
                      <input type="hidden" name="personId" value={item.id} />
                      {!isEditing && <input type="hidden" name="personNo" value={item.personNo} />}
                      {!isEditing && <input type="hidden" name="fullName" value={item.fullName} />}
                      {!isEditing && <input type="hidden" name="email" value={item.email} />}

                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            儲存
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(item.id)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(item.id)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          編輯
                        </button>
                      )}
                    </form>

                    {!isEditing && (
                      <form action={onDeleteAction}>
                        <input type="hidden" name="personId" value={item.id} />
                        <button className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">
                          刪除
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {!members.length && (
            <tr>
              <td className="px-3 py-4 text-slate-500" colSpan={4}>
                目前尚無學員帳號。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
