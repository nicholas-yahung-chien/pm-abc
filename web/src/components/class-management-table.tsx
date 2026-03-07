"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type ClassListItem = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
};

type ClassManagementTableProps = {
  classes: ClassListItem[];
  onUpdateAction: (formData: FormData) => void | Promise<void>;
  onDeleteAction: (formData: FormData) => void | Promise<void>;
  onBatchDeleteAction: (formData: FormData) => void | Promise<void>;
};

function previewDescription(value: string, maxLen = 24) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}...`;
}

export function ClassManagementTable({
  classes,
  onUpdateAction,
  onDeleteAction,
  onBatchDeleteAction,
}: ClassManagementTableProps) {
  const classById = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [descriptionEditorId, setDescriptionEditorId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        code: string;
        name: string;
        startDate: string;
        endDate: string;
        description: string;
      }
    >
  >({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [showFilters, setShowFilters] = useState(false);

  const ensureDraft = (classId: string) => {
    const source = classById.get(classId);
    if (!source) return;
    setDrafts((prev) => ({
      ...prev,
      [classId]: prev[classId] ?? {
        code: source.code,
        name: source.name,
        startDate: source.startDate,
        endDate: source.endDate,
        description: source.description,
      },
    }));
  };

  const startEdit = (classId: string) => {
    ensureDraft(classId);
    setEditingId(classId);
  };

  const cancelEdit = (classId: string) => {
    const source = classById.get(classId);
    if (!source) {
      setEditingId(null);
      return;
    }
    setDrafts((prev) => ({
      ...prev,
      [classId]: {
        code: source.code,
        name: source.name,
        startDate: source.startDate,
        endDate: source.endDate,
        description: source.description,
      },
    }));
    setEditingId(null);
  };

  const openDescriptionEditor = (classId: string) => {
    ensureDraft(classId);
    setDescriptionEditorId(classId);
  };

  const closeDescriptionEditor = () => {
    setDescriptionEditorId(null);
  };

  const submitClassUpdate = async (formData: FormData) => {
    setEditingId(null);
    setDescriptionEditorId(null);
    await onUpdateAction(formData);
  };

  const updateDraft = (
    classId: string,
    field: "code" | "name" | "startDate" | "endDate" | "description",
    value: string,
  ) => {
    const source = classById.get(classId);
    setDrafts((prev) => {
      const base = prev[classId] ?? {
        code: source?.code ?? "",
        name: source?.name ?? "",
        startDate: source?.startDate ?? "",
        endDate: source?.endDate ?? "",
        description: source?.description ?? "",
      };
      return {
        ...prev,
        [classId]: { ...base, [field]: value },
      };
    });
  };

  const columns: ColumnDef<ClassListItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="全選"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (!el) return;
            el.indeterminate = table.getIsSomePageRowsSelected();
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-slate-300"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="選擇此列"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-slate-300"
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 42,
    },
    {
      id: "code",
      accessorKey: "code",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 font-semibold"
        >
          代碼
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        const formId = `class-update-${item.id}`;
        const draft = drafts[item.id] ?? {
          code: item.code,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
        };

        if (isEditing) {
          return (
            <input
              form={formId}
              name="code"
              value={draft.code}
              onChange={(event) => updateDraft(item.id, "code", event.currentTarget.value)}
              required
              className="min-w-24"
            />
          );
        }

        return <span className="font-mono text-xs">{item.code}</span>;
      },
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 font-semibold"
        >
          名稱
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        const formId = `class-update-${item.id}`;
        const draft = drafts[item.id] ?? {
          code: item.code,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
        };

        if (isEditing) {
          return (
            <input
              form={formId}
              name="name"
              value={draft.name}
              onChange={(event) => updateDraft(item.id, "name", event.currentTarget.value)}
              required
              className="min-w-48"
            />
          );
        }

        return <span className="font-medium">{item.name}</span>;
      },
    },
    {
      id: "startDate",
      accessorKey: "startDate",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 font-semibold"
        >
          開始日期
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        const formId = `class-update-${item.id}`;
        const draft = drafts[item.id] ?? {
          code: item.code,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
        };

        if (isEditing) {
          return (
            <input
              form={formId}
              name="startDate"
              type="date"
              value={draft.startDate}
              onChange={(event) =>
                updateDraft(item.id, "startDate", event.currentTarget.value)
              }
              className="min-w-36"
            />
          );
        }

        return item.startDate || "-";
      },
    },
    {
      id: "endDate",
      accessorKey: "endDate",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 font-semibold"
        >
          結束日期
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        const formId = `class-update-${item.id}`;
        const draft = drafts[item.id] ?? {
          code: item.code,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
        };

        if (isEditing) {
          return (
            <input
              form={formId}
              name="endDate"
              type="date"
              value={draft.endDate}
              onChange={(event) => updateDraft(item.id, "endDate", event.currentTarget.value)}
              className="min-w-36"
            />
          );
        }

        return item.endDate || "-";
      },
    },
    {
      id: "description",
      accessorFn: (row) => row.description,
      header: () => <span className="font-semibold">說明</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        const draft = drafts[item.id] ?? {
          code: item.code,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
        };

        return (
          <button
            type="button"
            onClick={() => openDescriptionEditor(item.id)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
            title="查看或編輯說明"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="max-w-56 truncate">{previewDescription(draft.description)}</span>
          </button>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="font-semibold">操作</span>,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        const formId = `class-update-${item.id}`;
        const draft = drafts[item.id] ?? {
          code: item.code,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
        };

        return (
          <div className="flex items-center gap-2">
            <form id={formId} action={submitClassUpdate} className="contents">
              <input type="hidden" name="classId" value={item.id} />
              <input type="hidden" name="description" value={draft.description} />

              {!isEditing && <input type="hidden" name="code" value={item.code} />}
              {!isEditing && <input type="hidden" name="name" value={item.name} />}
              {!isEditing && (
                <input type="hidden" name="startDate" value={item.startDate || ""} />
              )}
              {!isEditing && <input type="hidden" name="endDate" value={item.endDate || ""} />}

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
                <input type="hidden" name="classId" value={item.id} />
                <button
                  title="刪除"
                  className="rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: classes,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedIds = table.getSelectedRowModel().rows.map((row) => row.original.id);
  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = table.getState().pagination.pageIndex + 1;

  const descriptionEditorClass = descriptionEditorId
    ? classById.get(descriptionEditorId) ?? null
    : null;
  const descriptionDraft = descriptionEditorClass
    ? drafts[descriptionEditorClass.id] ?? {
        code: descriptionEditorClass.code,
        name: descriptionEditorClass.name,
        startDate: descriptionEditorClass.startDate,
        endDate: descriptionEditorClass.endDate,
        description: descriptionEditorClass.description,
      }
    : null;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full items-center gap-2 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.currentTarget.value)}
              placeholder="搜尋班別代碼、名稱、日期、說明"
              className="!pl-11"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-label={showFilters ? "收合篩選欄位" : "展開篩選欄位"}
            aria-expanded={showFilters}
            className={[
              "inline-flex items-center justify-center rounded-md border p-2 transition",
              showFilters
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
            ].join(" ")}
            title={showFilters ? "收合篩選欄位" : "展開篩選欄位"}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <form
            id="class-batch-delete-form"
            action={onBatchDeleteAction}
            onSubmit={(event) => {
              if (!selectedIds.length) {
                event.preventDefault();
                return;
              }
              const confirmed = window.confirm(
                `確定要刪除 ${selectedIds.length} 個班別嗎？此操作會一併刪除其小組與關聯資料，且無法復原。`,
              );
              if (!confirmed) event.preventDefault();
            }}
          >
            <input type="hidden" name="classIds" value={selectedIds.join(",")} readOnly />
          </form>

          <button
            type="submit"
            form="class-batch-delete-form"
            disabled={!selectedIds.length}
            className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            批次刪除（{selectedIds.length}）
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid gap-2 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-slate-500">篩選：代碼</span>
            <input
              value={String(table.getColumn("code")?.getFilterValue() ?? "")}
              onChange={(event) =>
                table.getColumn("code")?.setFilterValue(event.currentTarget.value)
              }
              placeholder="輸入代碼"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-500">篩選：名稱</span>
            <input
              value={String(table.getColumn("name")?.getFilterValue() ?? "")}
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.currentTarget.value)
              }
              placeholder="輸入名稱"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-500">篩選：開始日期</span>
            <input
              value={String(table.getColumn("startDate")?.getFilterValue() ?? "")}
              onChange={(event) =>
                table.getColumn("startDate")?.setFilterValue(event.currentTarget.value)
              }
              placeholder="YYYY-MM-DD"
            />
          </label>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}

            {!table.getRowModel().rows.length && (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={8}>
                  目前尚無符合條件的班別資料。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">
          共 {table.getFilteredRowModel().rows.length} 筆，目前第 {currentPage} /{" "}
          {pageCount} 頁
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            每頁筆數
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.currentTarget.value))}
              className="w-24"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border border-slate-300 p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border border-slate-300 p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            跳至
            <input
              type="number"
              min={1}
              max={pageCount}
              value={currentPage}
              onChange={(event) => {
                const nextPage = Number(event.currentTarget.value);
                if (Number.isNaN(nextPage)) return;
                const normalized = Math.min(Math.max(nextPage, 1), pageCount);
                table.setPageIndex(normalized - 1);
              }}
              className="w-20"
            />
            頁
          </label>
        </div>
      </div>

      {descriptionEditorClass && descriptionDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={closeDescriptionEditor}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">編輯班別說明</h4>
                <p className="mt-1 text-sm text-slate-600">
                  {descriptionDraft.code} / {descriptionDraft.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDescriptionEditor}
                className="rounded-md border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              className="mt-4 min-h-48"
              value={descriptionDraft.description}
              onChange={(event) =>
                updateDraft(
                  descriptionEditorClass.id,
                  "description",
                  event.currentTarget.value,
                )
              }
              placeholder="請輸入班別說明"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDescriptionEditor}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                取消
              </button>

              <form action={submitClassUpdate}>
                <input type="hidden" name="classId" value={descriptionEditorClass.id} />
                <input type="hidden" name="code" value={descriptionDraft.code} />
                <input type="hidden" name="name" value={descriptionDraft.name} />
                <input type="hidden" name="startDate" value={descriptionDraft.startDate} />
                <input type="hidden" name="endDate" value={descriptionDraft.endDate} />
                <input type="hidden" name="description" value={descriptionDraft.description} />
                <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
                  儲存說明
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
