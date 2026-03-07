"use client";

import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { TrackingItemRow, TrackingSectionRow, TrackingSubsectionRow } from "@/lib/types";

type ActionHandler = (formData: FormData) => void | Promise<void>;

type TrackingManagementPanelProps = {
  groupId: string;
  returnTo: string;
  sections: TrackingSectionRow[];
  subsections: TrackingSubsectionRow[];
  items: TrackingItemRow[];
  onCreateSectionAction: ActionHandler;
  onCreateSubsectionAction: ActionHandler;
  onCreateItemAction: ActionHandler;
  onUpdateSectionAction: ActionHandler;
  onDeleteSectionAction: ActionHandler;
  onMoveSectionAction: ActionHandler;
  onUpdateSubsectionAction: ActionHandler;
  onDeleteSubsectionAction: ActionHandler;
  onMoveSubsectionAction: ActionHandler;
  onUpdateItemAction: ActionHandler;
  onDeleteItemAction: ActionHandler;
  onMoveItemOrderAction: ActionHandler;
};

type SectionDraft = {
  title: string;
  description: string;
};

type SubsectionDraft = {
  sectionId: string;
  title: string;
  description: string;
};

function formatDate(dateInput: string | null): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString("zh-TW");
}

function iconButton(kind: "edit" | "save" | "cancel" | "delete"): string {
  if (kind === "save") {
    return "rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100";
  }
  if (kind === "cancel") {
    return "rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100";
  }
  if (kind === "delete") {
    return "rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100";
  }
  return "rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100";
}

function moveButton(): string {
  return "rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 transition hover:bg-slate-100";
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
            title="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function TrackingManagementPanel({
  groupId,
  returnTo,
  sections,
  subsections,
  items,
  onCreateSectionAction,
  onCreateSubsectionAction,
  onCreateItemAction,
  onUpdateSectionAction,
  onDeleteSectionAction,
  onMoveSectionAction,
  onUpdateSubsectionAction,
  onDeleteSubsectionAction,
  onMoveSubsectionAction,
  onUpdateItemAction,
  onDeleteItemAction,
  onMoveItemOrderAction,
}: TrackingManagementPanelProps) {
  const orderedSections = useMemo(
    () =>
      [...sections].sort(
        (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
      ),
    [sections],
  );
  const orderedSubsections = useMemo(
    () =>
      [...subsections].sort(
        (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
      ),
    [subsections],
  );
  const orderedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
      ),
    [items],
  );

  const subsectionById = useMemo(
    () => new Map(orderedSubsections.map((item) => [item.id, item])),
    [orderedSubsections],
  );
  const sectionById = useMemo(
    () => new Map(orderedSections.map((item) => [item.id, item])),
    [orderedSections],
  );
  const subsectionsBySectionId = useMemo(() => {
    const map = new Map<string, TrackingSubsectionRow[]>();
    for (const subsection of orderedSubsections) {
      const list = map.get(subsection.section_id) ?? [];
      list.push(subsection);
      map.set(subsection.section_id, list);
    }
    return map;
  }, [orderedSubsections]);
  const itemsBySubsectionId = useMemo(() => {
    const map = new Map<string, TrackingItemRow[]>();
    for (const item of orderedItems) {
      const list = map.get(item.subsection_id) ?? [];
      list.push(item);
      map.set(item.subsection_id, list);
    }
    return map;
  }, [orderedItems]);
  const subsectionOptions = useMemo(
    () =>
      orderedSubsections.map((subsection) => ({
        id: subsection.id,
        label: `${sectionById.get(subsection.section_id)?.title ?? "-"} / ${subsection.title}`,
      })),
    [orderedSubsections, sectionById],
  );
  const itemById = useMemo(() => new Map(orderedItems.map((item) => [item.id, item])), [orderedItems]);

  const [createModal, setCreateModal] = useState<"section" | "subsection" | "item" | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSubsectionId, setEditingSubsectionId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, SectionDraft>>({});
  const [subsectionDrafts, setSubsectionDrafts] = useState<Record<string, SubsectionDraft>>({});

  const editingItem = editingItemId ? itemById.get(editingItemId) ?? null : null;

  const beginSectionEdit = (sectionId: string) => {
    const source = sectionById.get(sectionId);
    if (!source) return;
    setSectionDrafts((prev) => ({
      ...prev,
      [sectionId]: { title: source.title, description: source.description ?? "" },
    }));
    setEditingSectionId(sectionId);
  };

  const beginSubsectionEdit = (subsectionId: string) => {
    const source = subsectionById.get(subsectionId);
    if (!source) return;
    setSubsectionDrafts((prev) => ({
      ...prev,
      [subsectionId]: {
        sectionId: source.section_id,
        title: source.title,
        description: source.description ?? "",
      },
    }));
    setEditingSubsectionId(subsectionId);
  };

  const setSectionDraftValue = (sectionId: string, key: keyof SectionDraft, value: string) => {
    setSectionDrafts((prev) => ({
      ...prev,
      [sectionId]: {
        title: prev[sectionId]?.title ?? sectionById.get(sectionId)?.title ?? "",
        description: prev[sectionId]?.description ?? sectionById.get(sectionId)?.description ?? "",
        [key]: value,
      },
    }));
  };

  const setSubsectionDraftValue = (
    subsectionId: string,
    key: keyof SubsectionDraft,
    value: string,
  ) => {
    setSubsectionDrafts((prev) => ({
      ...prev,
      [subsectionId]: {
        sectionId:
          prev[subsectionId]?.sectionId ?? subsectionById.get(subsectionId)?.section_id ?? "",
        title: prev[subsectionId]?.title ?? subsectionById.get(subsectionId)?.title ?? "",
        description:
          prev[subsectionId]?.description ?? subsectionById.get(subsectionId)?.description ?? "",
        [key]: value,
      },
    }));
  };

  const cancelSectionEdit = (sectionId: string) => {
    const source = sectionById.get(sectionId);
    if (!source) {
      setEditingSectionId(null);
      return;
    }
    setSectionDrafts((prev) => ({
      ...prev,
      [sectionId]: { title: source.title, description: source.description ?? "" },
    }));
    setEditingSectionId(null);
  };

  const cancelSubsectionEdit = (subsectionId: string) => {
    const source = subsectionById.get(subsectionId);
    if (!source) {
      setEditingSubsectionId(null);
      return;
    }
    setSubsectionDrafts((prev) => ({
      ...prev,
      [subsectionId]: {
        sectionId: source.section_id,
        title: source.title,
        description: source.description ?? "",
      },
    }));
    setEditingSubsectionId(null);
  };

  const submitCreateSection = async (formData: FormData) => {
    setCreateModal(null);
    await onCreateSectionAction(formData);
  };

  const submitCreateSubsection = async (formData: FormData) => {
    setCreateModal(null);
    await onCreateSubsectionAction(formData);
  };

  const submitCreateItem = async (formData: FormData) => {
    setCreateModal(null);
    await onCreateItemAction(formData);
  };

  const submitSectionUpdate = async (formData: FormData) => {
    setEditingSectionId(null);
    await onUpdateSectionAction(formData);
  };

  const submitSubsectionUpdate = async (formData: FormData) => {
    setEditingSubsectionId(null);
    await onUpdateSubsectionAction(formData);
  };

  const submitItemUpdate = async (formData: FormData) => {
    setEditingItemId(null);
    await onUpdateItemAction(formData);
  };

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">追蹤矩陣管理（教練）</h2>
        <p className="mt-1 text-sm text-slate-600">新增、編輯、排序與刪除追蹤大項、小項、追蹤項目。</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreateModal("section")}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            新增追蹤大項
          </button>
          <button
            type="button"
            onClick={() => setCreateModal("subsection")}
            disabled={!orderedSections.length}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Plus className="h-4 w-4" />
            新增追蹤小項
          </button>
          <button
            type="button"
            onClick={() => setCreateModal("item")}
            disabled={!orderedSubsections.length}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            <Plus className="h-4 w-4" />
            新增追蹤項目
          </button>
        </div>
      </article>

      {orderedSections.map((section) => {
        const sectionFormId = `tracking-section-${section.id}`;
        const sectionDraft = sectionDrafts[section.id] ?? {
          title: section.title,
          description: section.description ?? "",
        };
        const isEditingSection = editingSectionId === section.id;
        const subsectionRows = subsectionsBySectionId.get(section.id) ?? [];

        return (
          <article key={section.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
              <div className="mt-0.5 flex flex-col gap-1">
                <form action={onMoveSectionAction}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="up" />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className={moveButton()} title="上移大項">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </form>
                <form action={onMoveSectionAction}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input type="hidden" name="direction" value="down" />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className={moveButton()} title="下移大項">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </form>
              </div>

              <div className="min-w-0 flex-1">
                {isEditingSection ? (
                  <form id={sectionFormId} action={submitSectionUpdate} className="space-y-2">
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input
                      name="title"
                      value={sectionDraft.title}
                      onChange={(event) =>
                        setSectionDraftValue(section.id, "title", event.currentTarget.value)
                      }
                      required
                    />
                    <textarea
                      name="description"
                      rows={2}
                      value={sectionDraft.description}
                      onChange={(event) =>
                        setSectionDraftValue(section.id, "description", event.currentTarget.value)
                      }
                      placeholder="大項說明"
                    />
                  </form>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {section.description || "-"}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isEditingSection ? (
                  <>
                    <button form={sectionFormId} type="submit" className={iconButton("save")} title="儲存">
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelSectionEdit(section.id)}
                      className={iconButton("cancel")}
                      title="取消"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => beginSectionEdit(section.id)}
                      className={iconButton("edit")}
                      title="編輯大項"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <form action={onDeleteSectionAction}>
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button className={iconButton("delete")} title="刪除大項">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {subsectionRows.map((subsection) => {
                const subsectionFormId = `tracking-subsection-${subsection.id}`;
                const subsectionDraft = subsectionDrafts[subsection.id] ?? {
                  sectionId: subsection.section_id,
                  title: subsection.title,
                  description: subsection.description ?? "",
                };
                const isEditingSubsection = editingSubsectionId === subsection.id;
                const rows = itemsBySubsectionId.get(subsection.id) ?? [];

                return (
                  <div key={subsection.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="mt-0.5 flex flex-col gap-1">
                        <form action={onMoveSubsectionAction}>
                          <input type="hidden" name="groupId" value={groupId} />
                          <input type="hidden" name="sectionId" value={section.id} />
                          <input type="hidden" name="subsectionId" value={subsection.id} />
                          <input type="hidden" name="direction" value="up" />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button className={moveButton()} title="上移小項">
                            <ArrowUp className="h-4 w-4" />
                          </button>
                        </form>
                        <form action={onMoveSubsectionAction}>
                          <input type="hidden" name="groupId" value={groupId} />
                          <input type="hidden" name="sectionId" value={section.id} />
                          <input type="hidden" name="subsectionId" value={subsection.id} />
                          <input type="hidden" name="direction" value="down" />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button className={moveButton()} title="下移小項">
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </form>
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditingSubsection ? (
                          <form id={subsectionFormId} action={submitSubsectionUpdate} className="space-y-2">
                            <input type="hidden" name="groupId" value={groupId} />
                            <input type="hidden" name="subsectionId" value={subsection.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <select
                              name="sectionId"
                              value={subsectionDraft.sectionId}
                              onChange={(event) =>
                                setSubsectionDraftValue(
                                  subsection.id,
                                  "sectionId",
                                  event.currentTarget.value,
                                )
                              }
                              required
                            >
                              {orderedSections.map((sectionOption) => (
                                <option key={sectionOption.id} value={sectionOption.id}>
                                  {sectionOption.title}
                                </option>
                              ))}
                            </select>
                            <input
                              name="title"
                              value={subsectionDraft.title}
                              onChange={(event) =>
                                setSubsectionDraftValue(
                                  subsection.id,
                                  "title",
                                  event.currentTarget.value,
                                )
                              }
                              required
                            />
                            <textarea
                              name="description"
                              rows={2}
                              value={subsectionDraft.description}
                              onChange={(event) =>
                                setSubsectionDraftValue(
                                  subsection.id,
                                  "description",
                                  event.currentTarget.value,
                                )
                              }
                              placeholder="小項說明"
                            />
                          </form>
                        ) : (
                          <>
                            <h4 className="text-base font-semibold text-slate-900">{subsection.title}</h4>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                              {subsection.description || "-"}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isEditingSubsection ? (
                          <>
                            <button form={subsectionFormId} type="submit" className={iconButton("save")} title="儲存">
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelSubsectionEdit(subsection.id)}
                              className={iconButton("cancel")}
                              title="取消"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => beginSubsectionEdit(subsection.id)}
                              className={iconButton("edit")}
                              title="編輯小項"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <form action={onDeleteSubsectionAction}>
                              <input type="hidden" name="groupId" value={groupId} />
                              <input type="hidden" name="subsectionId" value={subsection.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <button className={iconButton("delete")} title="刪除小項">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="w-20 px-3 py-2">順序</th>
                            <th className="px-3 py-2">追蹤項目</th>
                            <th className="w-28 px-3 py-2">到期日</th>
                            <th className="w-24 px-3 py-2">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100 align-top">
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  <form action={onMoveItemOrderAction}>
                                    <input type="hidden" name="groupId" value={groupId} />
                                    <input type="hidden" name="sectionId" value={section.id} />
                                    <input type="hidden" name="subsectionId" value={subsection.id} />
                                    <input type="hidden" name="itemId" value={item.id} />
                                    <input type="hidden" name="direction" value="up" />
                                    <input type="hidden" name="returnTo" value={returnTo} />
                                    <button className={moveButton()} title="上移項目">
                                      <ArrowUp className="h-4 w-4" />
                                    </button>
                                  </form>
                                  <form action={onMoveItemOrderAction}>
                                    <input type="hidden" name="groupId" value={groupId} />
                                    <input type="hidden" name="sectionId" value={section.id} />
                                    <input type="hidden" name="subsectionId" value={subsection.id} />
                                    <input type="hidden" name="itemId" value={item.id} />
                                    <input type="hidden" name="direction" value="down" />
                                    <input type="hidden" name="returnTo" value={returnTo} />
                                    <button className={moveButton()} title="下移項目">
                                      <ArrowDown className="h-4 w-4" />
                                    </button>
                                  </form>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <p className="font-medium text-slate-900">{item.title}</p>
                                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{item.content || "-"}</p>
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-700">{formatDate(item.due_date)}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(item.id)}
                                    className={iconButton("edit")}
                                    title="編輯追蹤項目"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <form action={onDeleteItemAction}>
                                    <input type="hidden" name="groupId" value={groupId} />
                                    <input type="hidden" name="itemId" value={item.id} />
                                    <input type="hidden" name="returnTo" value={returnTo} />
                                    <button className={iconButton("delete")} title="刪除追蹤項目">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!rows.length && (
                            <tr>
                              <td className="px-3 py-4 text-slate-500" colSpan={4}>
                                目前尚無追蹤項目。
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {!subsectionRows.length && (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  目前尚無追蹤小項。
                </p>
              )}
            </div>
          </article>
        );
      })}

      {!orderedSections.length && (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">目前尚無追蹤大項。請先新增追蹤大項。</p>
        </article>
      )}

      {createModal === "section" && (
        <Modal title="新增追蹤大項" onClose={() => setCreateModal(null)}>
          <form action={submitCreateSection} className="space-y-3">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">大項名稱 *</span>
              <input name="title" required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">說明</span>
              <textarea name="description" rows={4} />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                取消
              </button>
              <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
                新增大項
              </button>
            </div>
          </form>
        </Modal>
      )}

      {createModal === "subsection" && (
        <Modal title="新增追蹤小項" onClose={() => setCreateModal(null)}>
          <form action={submitCreateSubsection} className="space-y-3">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">所屬大項 *</span>
              <select name="sectionId" defaultValue={orderedSections[0]?.id ?? ""} required>
                {orderedSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">小項名稱 *</span>
              <input name="title" required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">說明</span>
              <textarea name="description" rows={4} />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                取消
              </button>
              <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                新增小項
              </button>
            </div>
          </form>
        </Modal>
      )}

      {createModal === "item" && (
        <Modal title="新增追蹤項目" onClose={() => setCreateModal(null)}>
          <form action={submitCreateItem} className="space-y-3">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">所屬大項 *</span>
              <select name="sectionId" defaultValue={orderedSections[0]?.id ?? ""} required>
                {orderedSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">所屬小項 *</span>
              <select name="subsectionId" defaultValue={orderedSubsections[0]?.id ?? ""} required>
                {subsectionOptions.map((subsection) => (
                  <option key={subsection.id} value={subsection.id}>
                    {subsection.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">項目名稱 *</span>
              <input name="title" required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">項目內容</span>
              <textarea name="content" rows={4} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">預定完成日</span>
              <input name="dueDate" type="date" />
            </label>
            <input type="hidden" name="extraData" value="" />
            <input type="hidden" name="externalUrl" value="" />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                取消
              </button>
              <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
                新增追蹤項目
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingItem && (
        <Modal title="編輯追蹤項目" onClose={() => setEditingItemId(null)}>
          <form action={submitItemUpdate} className="space-y-3">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="itemId" value={editingItem.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="extraData" value={editingItem.extra_data ?? ""} />
            <input type="hidden" name="externalUrl" value={editingItem.external_url ?? ""} />
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">所屬大項 *</span>
              <select name="sectionId" defaultValue={editingItem.section_id} required>
                {orderedSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">所屬小項 *</span>
              <select name="subsectionId" defaultValue={editingItem.subsection_id} required>
                {subsectionOptions.map((subsection) => (
                  <option key={subsection.id} value={subsection.id}>
                    {subsection.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">項目名稱 *</span>
              <input name="title" defaultValue={editingItem.title} required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">項目內容</span>
              <textarea name="content" rows={4} defaultValue={editingItem.content ?? ""} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">預定完成日</span>
              <input name="dueDate" type="date" defaultValue={editingItem.due_date ?? ""} />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItemId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                取消
              </button>
              <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                儲存變更
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
