"use client";

import { Check, Eye, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";

type GroupDirectoryMemberItem = {
  personId: string;
  personNo: string;
  fullName: string;
  displayName: string;
  rolesLabel: string;
  phone: string;
  email: string;
  lineId: string;
  intro: string;
};

type GroupDirectoryMemberTableProps = {
  groupId: string;
  members: GroupDirectoryMemberItem[];
  onUpdateAction: (formData: FormData) => void | Promise<void>;
};

function previewText(value: string, maxLen = 28) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}...`;
}

export function GroupDirectoryMemberTable({
  groupId,
  members,
  onUpdateAction,
}: GroupDirectoryMemberTableProps) {
  const memberById = useMemo(
    () => new Map(members.map((item) => [item.personId, item])),
    [members],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [introEditorId, setIntroEditorId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { displayName: string; phone: string; lineId: string; intro: string }>
  >({});

  const ensureDraft = (personId: string) => {
    const source = memberById.get(personId);
    if (!source) return;
    setDrafts((prev) => ({
      ...prev,
      [personId]: prev[personId] ?? {
        displayName: source.displayName,
        phone: source.phone,
        lineId: source.lineId,
        intro: source.intro,
      },
    }));
  };

  const startEdit = (personId: string) => {
    ensureDraft(personId);
    setEditingId(personId);
  };

  const cancelEdit = (personId: string) => {
    const source = memberById.get(personId);
    if (!source) {
      setEditingId(null);
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [personId]: {
        displayName: source.displayName,
        phone: source.phone,
        lineId: source.lineId,
        intro: source.intro,
      },
    }));
    if (introEditorId === personId) {
      setIntroEditorId(null);
    }
    setEditingId(null);
  };

  const openIntroEditor = (personId: string) => {
    ensureDraft(personId);
    setIntroEditorId(personId);
  };

  const closeIntroEditor = () => {
    setIntroEditorId(null);
  };

  const updateDraft = (
    personId: string,
    field: "displayName" | "phone" | "lineId" | "intro",
    value: string,
  ) => {
    const source = memberById.get(personId);
    setDrafts((prev) => {
      const base = prev[personId] ?? {
        displayName: source?.displayName ?? "",
        phone: source?.phone ?? "",
        lineId: source?.lineId ?? "",
        intro: source?.intro ?? "",
      };
      return {
        ...prev,
        [personId]: { ...base, [field]: value },
      };
    });
  };

  const submitDirectoryUpdate = async (formData: FormData) => {
    setEditingId(null);
    setIntroEditorId(null);
    await onUpdateAction(formData);
  };

  const introEditorMember = introEditorId ? memberById.get(introEditorId) ?? null : null;
  const introEditorDraft = introEditorMember
    ? drafts[introEditorMember.personId] ?? {
        displayName: introEditorMember.displayName,
        phone: introEditorMember.phone,
        lineId: introEditorMember.lineId,
        intro: introEditorMember.intro,
      }
    : null;

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2">學員編號</th>
            <th className="px-3 py-2">姓名</th>
            <th className="px-3 py-2">組內角色</th>
            <th className="px-3 py-2">希望別人怎麼稱呼</th>
            <th className="px-3 py-2">電話</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">LINE ID</th>
            <th className="px-3 py-2">自我介紹</th>
            <th className="px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map((item) => {
            const isEditing = editingId === item.personId;
            const formId = `directory-member-${item.personId}`;
            const draft = drafts[item.personId] ?? {
              displayName: item.displayName,
              phone: item.phone,
              lineId: item.lineId,
              intro: item.intro,
            };

            return (
              <tr key={item.personId} className="border-t border-slate-100">
                <td className="px-3 py-2">{item.personNo || "-"}</td>
                <td className="px-3 py-2 font-medium">{item.fullName || "-"}</td>
                <td className="px-3 py-2">{item.rolesLabel || "-"}</td>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <input
                      form={formId}
                      name="displayName"
                      value={draft.displayName}
                      onChange={(event) =>
                        updateDraft(item.personId, "displayName", event.currentTarget.value)
                      }
                      placeholder="例如：小明"
                      className="min-w-40"
                    />
                  ) : (
                    item.displayName || "-"
                  )}
                </td>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <input
                      form={formId}
                      name="phone"
                      value={draft.phone}
                      onChange={(event) =>
                        updateDraft(item.personId, "phone", event.currentTarget.value)
                      }
                      placeholder="電話"
                      className="min-w-36"
                    />
                  ) : (
                    item.phone || "-"
                  )}
                </td>
                <td className="px-3 py-2">{item.email || "-"}</td>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <input
                      form={formId}
                      name="lineId"
                      value={draft.lineId}
                      onChange={(event) =>
                        updateDraft(item.personId, "lineId", event.currentTarget.value)
                      }
                      placeholder="LINE ID"
                      className="min-w-36"
                    />
                  ) : (
                    item.lineId || "-"
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openIntroEditor(item.personId)}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
                    title={isEditing ? "編輯自我介紹" : "查看自我介紹"}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="max-w-44 truncate">{previewText(draft.intro)}</span>
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <form id={formId} action={submitDirectoryUpdate} className="contents">
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="personId" value={item.personId} />
                      <input type="hidden" name="intro" value={draft.intro} />

                      {!isEditing && (
                        <>
                          <input type="hidden" name="displayName" value={item.displayName} />
                          <input type="hidden" name="phone" value={item.phone} />
                          <input type="hidden" name="lineId" value={item.lineId} />
                        </>
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
                            onClick={() => cancelEdit(item.personId)}
                            title="取消"
                            className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(item.personId)}
                          title="編輯"
                          className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
          {!members.length && (
            <tr>
              <td className="px-3 py-4 text-slate-500" colSpan={9}>
                目前此小組尚無學員資料。
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {introEditorMember && introEditorDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={closeIntroEditor}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">
                  {editingId === introEditorMember.personId ? "編輯自我介紹" : "查看自我介紹"}
                </h4>
                <p className="mt-1 text-sm text-slate-600">{introEditorMember.fullName}</p>
              </div>
              <button
                type="button"
                onClick={closeIntroEditor}
                className="rounded-md border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editingId === introEditorMember.personId ? (
              <textarea
                className="mt-4 min-h-48"
                value={introEditorDraft.intro}
                onChange={(event) =>
                  updateDraft(
                    introEditorMember.personId,
                    "intro",
                    event.currentTarget.value,
                  )
                }
                placeholder="請輸入自我介紹"
              />
            ) : (
              <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {introEditorDraft.intro || "尚未填寫自我介紹。"}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeIntroEditor}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
