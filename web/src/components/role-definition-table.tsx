"use client";

import { Check, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";

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
                </td>
              </tr>
            );
          })}

          {!roles.length && (
            <tr>
              <td className="px-3 py-4 text-slate-500" colSpan={3}>
                目前尚無角色資料。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
