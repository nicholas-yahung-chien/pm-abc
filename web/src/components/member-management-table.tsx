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
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
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
  onBatchDeleteAction: (formData: FormData) => void | Promise<void>;
};

export function MemberManagementTable({
  members,
  onUpdateAction,
  onDeleteAction,
  onBatchDeleteAction,
}: MemberManagementTableProps) {
  const memberById = useMemo(
    () => new Map(members.map((item) => [item.id, item])),
    [members],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { personNo: string; fullName: string; email: string }>
  >({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

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

  const columns: ColumnDef<MemberListItem>[] = [
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
      id: "personNo",
      accessorKey: "personNo",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 font-semibold"
        >
          學員編號
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        const formId = `member-update-${item.id}`;
        const draft = drafts[item.id] ?? {
          personNo: item.personNo,
          fullName: item.fullName,
          email: item.email,
        };

        if (isEditing) {
          return (
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
          );
        }

        return <span className="font-mono text-xs">{item.personNo || "-"}</span>;
      },
    },
    {
      id: "fullName",
      accessorKey: "fullName",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 font-semibold"
        >
          學員姓名
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        const formId = `member-update-${item.id}`;
        const draft = drafts[item.id] ?? {
          personNo: item.personNo,
          fullName: item.fullName,
          email: item.email,
        };

        if (isEditing) {
          return (
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
          );
        }

        return item.fullName || "-";
      },
    },
    {
      id: "email",
      accessorKey: "email",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 font-semibold"
        >
          Email
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id;
        const formId = `member-update-${item.id}`;
        const draft = drafts[item.id] ?? {
          personNo: item.personNo,
          fullName: item.fullName,
          email: item.email,
        };

        if (isEditing) {
          return (
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
          );
        }

        return item.email || "-";
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
        const formId = `member-update-${item.id}`;

        return (
          <div className="flex items-center gap-2">
            <form id={formId} action={onUpdateAction} className="contents">
              <input type="hidden" name="personId" value={item.id} />

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
                <input type="hidden" name="personId" value={item.id} />
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
    data: members,
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

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.id);

  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.currentTarget.value)}
            placeholder="搜尋學員編號、姓名、Email"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <form
            id="member-batch-delete-form"
            action={onBatchDeleteAction}
            onSubmit={(event) => {
              if (!selectedIds.length) {
                event.preventDefault();
                return;
              }
              const confirmed = window.confirm(
                `確定要刪除 ${selectedIds.length} 位學員嗎？此操作無法復原。`,
              );
              if (!confirmed) event.preventDefault();
            }}
          >
            <input type="hidden" name="personIds" value={selectedIds.join(",")} readOnly />
          </form>

          <button
            type="submit"
            form="member-batch-delete-form"
            disabled={!selectedIds.length}
            className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            批次刪除（{selectedIds.length}）
          </button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs text-slate-500">篩選：學員編號</span>
          <input
            value={String(table.getColumn("personNo")?.getFilterValue() ?? "")}
            onChange={(event) =>
              table.getColumn("personNo")?.setFilterValue(event.currentTarget.value)
            }
            placeholder="輸入編號"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">篩選：學員姓名</span>
          <input
            value={String(table.getColumn("fullName")?.getFilterValue() ?? "")}
            onChange={(event) =>
              table.getColumn("fullName")?.setFilterValue(event.currentTarget.value)
            }
            placeholder="輸入姓名"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">篩選：Email</span>
          <input
            value={String(table.getColumn("email")?.getFilterValue() ?? "")}
            onChange={(event) =>
              table.getColumn("email")?.setFilterValue(event.currentTarget.value)
            }
            placeholder="輸入 Email"
          />
        </label>
      </div>

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
                <td className="px-3 py-4 text-slate-500" colSpan={5}>
                  目前尚無符合條件的學員資料。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">
          共 {table.getFilteredRowModel().rows.length} 筆，
          目前第 {currentPage} / {pageCount} 頁
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
    </div>
  );
}
