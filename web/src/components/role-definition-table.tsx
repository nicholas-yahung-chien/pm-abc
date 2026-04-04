"use client";

import { Check, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TableEmptyRow } from "@/components/empty-state";

type RoleItem = {
  id: string;
  name: string;
  description: string;
};

type RoleDefinitionTableProps = {
  groupId: string;
  returnTo: string;
  roles: RoleItem[];
  onUpdateAction: (formData: FormData) => void | Promise<void>;
};

export function RoleDefinitionTable({
  groupId,
  returnTo,
  roles,
  onUpdateAction,
}: RoleDefinitionTableProps) {
  const roleById = useMemo(() => new Map(roles.map((item) => [item.id, item])), [roles]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; description: string }>>(
    {},
  );

  const startEdit = (roleId: string) => {
    const source = roleById.get(roleId);
    if (!source) return;
    setDrafts((prev) => ({
      ...prev,
      [roleId]: {
        name: source.name,
        description: source.description,
      },
    }));
    setEditingId(roleId);
  };

  const cancelEdit = (roleId: string) => {
    const source = roleById.get(roleId);
    if (!source) {
      setEditingId(null);
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [roleId]: {
        name: source.name,
        description: source.description,
      },
    }));
    setEditingId(null);
  };

  const updateDraft = (
    roleId: string,
    field: "name" | "description",
    value: string,
  ) => {
    const source = roleById.get(roleId);
    setDrafts((prev) => {
      const base = prev[roleId] ?? {
        name: source?.name ?? "",
        description: source?.description ?? "",
      };
      return {
        ...prev,
        [roleId]: { ...base, [field]: value },
      };
    });
  };

  const submitRoleUpdate = async (formData: FormData) => {
    setEditingId(null);
    await onUpdateAction(formData);
  };

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2">角色</th>
            <th className="px-3 py-2">說明</th>
            <th className="px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((item) => {
            const isEditing = editingId === item.id;
            const formId = `role-update-${item.id}`;
            const draft = drafts[item.id] ?? {
              name: item.name,
              description: item.description,
            };

            return (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2 align-top">
                  {isEditing ? (
                    <input
                      form={formId}
                      name="name"
                      value={draft.name}
                      onChange={(event) =>
                        updateDraft(item.id, "name", event.currentTarget.value)
                      }
                      required
                      className="min-w-40"
                    />
                  ) : (
                    <span className="font-medium">{item.name}</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {isEditing ? (
                    <textarea
                      form={formId}
                      name="description"
                      value={draft.description}
                      onChange={(event) =>
                        updateDraft(item.id, "description", event.currentTarget.value)
                      }
                      rows={4}
                      className="min-w-96"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words text-slate-700">
                      {item.description || "-"}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <form id={formId} action={submitRoleUpdate} className="flex items-center gap-2">
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="roleId" value={item.id} />
                    {!isEditing && <input type="hidden" name="name" value={item.name} />}
                    {!isEditing && (
                      <input type="hidden" name="description" value={item.description || ""} />
                    )}

                    {isEditing ? (
                      <>
                        <button
                          type="submit"
                          title="儲存"
                          className="btn-icon-save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(item.id)}
                          title="取消"
                          className="btn-icon-cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(item.id)}
                        title="編輯"
                        className="btn-icon-edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </form>
                </td>
              </tr>
            );
          })}

          {!roles.length && (
            <TableEmptyRow colSpan={3} message="目前尚無角色資料。" />
          )}
        </tbody>
      </table>
    </div>
  );
}
