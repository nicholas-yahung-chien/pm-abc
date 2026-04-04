"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TableEmptyRow } from "@/components/empty-state";

type RoleOption = {
  id: string;
  name: string;
};

type MemberOption = {
  id: string;
  label: string;
};

type AssignmentItem = {
  id: string;
  roleId: string;
  roleName: string;
  personId: string;
  personLabel: string;
  note: string;
};

type RoleAssignmentTableProps = {
  groupId: string;
  returnTo: string;
  roles: RoleOption[];
  members: MemberOption[];
  assignments: AssignmentItem[];
  onUpdateAction: (formData: FormData) => void | Promise<void>;
  onDeleteAction: (formData: FormData) => void | Promise<void>;
};

export function RoleAssignmentTable({
  groupId,
  returnTo,
  roles,
  members,
  assignments,
  onUpdateAction,
  onDeleteAction,
}: RoleAssignmentTableProps) {
  const assignmentById = useMemo(
    () => new Map(assignments.map((item) => [item.id, item])),
    [assignments],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { roleId: string; personId: string; note: string }>
  >({});

  const startEdit = (assignmentId: string) => {
    const source = assignmentById.get(assignmentId);
    if (!source) return;

    setDrafts((prev) => ({
      ...prev,
      [assignmentId]: {
        roleId: source.roleId,
        personId: source.personId,
        note: source.note,
      },
    }));
    setEditingId(assignmentId);
  };

  const cancelEdit = (assignmentId: string) => {
    const source = assignmentById.get(assignmentId);
    if (!source) {
      setEditingId(null);
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [assignmentId]: {
        roleId: source.roleId,
        personId: source.personId,
        note: source.note,
      },
    }));
    setEditingId(null);
  };

  const updateDraft = (
    assignmentId: string,
    field: "roleId" | "personId" | "note",
    value: string,
  ) => {
    const source = assignmentById.get(assignmentId);
    setDrafts((prev) => {
      const base = prev[assignmentId] ?? {
        roleId: source?.roleId ?? "",
        personId: source?.personId ?? "",
        note: source?.note ?? "",
      };

      return {
        ...prev,
        [assignmentId]: { ...base, [field]: value },
      };
    });
  };

  const submitAssignmentUpdate = async (formData: FormData) => {
    setEditingId(null);
    await onUpdateAction(formData);
  };

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2">角色</th>
            <th className="px-3 py-2">學員</th>
            <th className="px-3 py-2">備註</th>
            <th className="px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((item) => {
            const isEditing = editingId === item.id;
            const formId = `role-assignment-${item.id}`;
            const draft = drafts[item.id] ?? {
              roleId: item.roleId,
              personId: item.personId,
              note: item.note,
            };

            return (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2 align-top">
                  {isEditing ? (
                    <select
                      form={formId}
                      name="roleId"
                      value={draft.roleId}
                      onChange={(event) =>
                        updateDraft(item.id, "roleId", event.currentTarget.value)
                      }
                      required
                      className="min-w-40"
                    >
                      <option value="" disabled>
                        請選擇角色
                      </option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    item.roleName || "-"
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {isEditing ? (
                    <select
                      form={formId}
                      name="personId"
                      value={draft.personId}
                      onChange={(event) =>
                        updateDraft(item.id, "personId", event.currentTarget.value)
                      }
                      required
                      className="min-w-40"
                    >
                      <option value="" disabled>
                        請選擇學員
                      </option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    item.personLabel || "-"
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {isEditing ? (
                    <textarea
                      form={formId}
                      name="note"
                      value={draft.note}
                      onChange={(event) =>
                        updateDraft(item.id, "note", event.currentTarget.value)
                      }
                      rows={3}
                      className="min-w-80"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words text-slate-700">
                      {item.note || "-"}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-2">
                    <form id={formId} action={submitAssignmentUpdate} className="contents">
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="assignmentId" value={item.id} />

                      {!isEditing && <input type="hidden" name="roleId" value={item.roleId} />}
                      {!isEditing && (
                        <input type="hidden" name="personId" value={item.personId} />
                      )}
                      {!isEditing && (
                        <input type="hidden" name="note" value={item.note || ""} />
                      )}

                      {isEditing ? (
                        <>
                          <button
                            type="submit"
                            title="儲存"
                            className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(item.id)}
                            title="取消"
                            className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(item.id)}
                          title="編輯"
                          className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </form>

                    {!isEditing && (
                      <form action={onDeleteAction}>
                        <input type="hidden" name="groupId" value={groupId} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="assignmentId" value={item.id} />
                        <button
                          title="刪除"
                          className="rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {!assignments.length && (
            <TableEmptyRow colSpan={4} message="目前尚無角色指派資料。" />
          )}
        </tbody>
      </table>
    </div>
  );
}
