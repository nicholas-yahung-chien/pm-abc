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
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowRightCircle,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type GroupListItem = {
  id: string;
  classCode: string;
  code: string;
  name: string;
  description: string;
  ownerCoachAccountId: string;
};

type CoachOption = {
  id: string;
  displayName: string;
  email: string;
};

type GroupManagementTableProps = {
  groups: GroupListItem[];
  coaches: CoachOption[];
  onAssignCoachAction: (formData: FormData) => void | Promise<void>;
};

function previewDescription(value: string, maxLen = 24) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}...`;
}

export function GroupManagementTable({
  groups,
  coaches,
  onAssignCoachAction,
}: GroupManagementTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [coachDraftByGroupId, setCoachDraftByGroupId] = useState<Record<string, string>>({});

  const coachLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of coaches) {
      map.set(item.id, item.displayName || item.email);
    }
    return map;
  }, [coaches]);

  const columns: ColumnDef<GroupListItem>[] = [
    {
      id: "classCode",
      accessorKey: "classCode",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 font-semibold"
        >
          班別
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => row.original.classCode || "-",
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
          小組代碼
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
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
          小組名稱
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "description",
      accessorFn: (row) => row.description,
      header: () => <span className="font-semibold">說明</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="max-w-56 truncate text-xs text-slate-700">
          {previewDescription(row.original.description)}
        </span>
      ),
    },
    {
      id: "ownerCoach",
      accessorFn: (row) => coachLabelById.get(row.ownerCoachAccountId) ?? "",
      header: () => <span className="font-semibold">小組教練</span>,
      cell: ({ row }) => {
        const group = row.original;
        const selectedCoachId =
          coachDraftByGroupId[group.id] ?? group.ownerCoachAccountId ?? "";
        const hasCoaches = coaches.length > 0;
        return (
          <form action={onAssignCoachAction} className="flex min-w-64 items-center gap-2">
            <input type="hidden" name="groupId" value={group.id} />
            <select
              name="coachAccountId"
              value={selectedCoachId}
              onChange={(event) => {
                setCoachDraftByGroupId((prev) => ({
                  ...prev,
                  [group.id]: event.currentTarget.value,
                }));
              }}
              required
              disabled={!hasCoaches}
            >
              <option value="" disabled>
                {hasCoaches ? "請選擇教練" : "無可用教練"}
              </option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.displayName || coach.email}
                </option>
              ))}
            </select>
            <button
              title="儲存教練指派"
              disabled={!hasCoaches}
              className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
            >
              <Check className="h-4 w-4" />
            </button>
          </form>
        );
      },
    },
    {
      id: "entry",
      header: () => <span className="font-semibold">管理入口</span>,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <Link
          href={`/groups/${row.original.id}`}
          title="進入小組"
          className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100"
        >
          <ArrowRightCircle className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  const table = useReactTable({
    data: groups,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="mt-4 space-y-4">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.currentTarget.value)}
          placeholder="搜尋班別、小組代碼、小組名稱"
          className="pl-9"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs text-slate-500">篩選：班別</span>
          <input
            value={String(table.getColumn("classCode")?.getFilterValue() ?? "")}
            onChange={(event) =>
              table.getColumn("classCode")?.setFilterValue(event.currentTarget.value)
            }
            placeholder="輸入班別"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">篩選：小組代碼</span>
          <input
            value={String(table.getColumn("code")?.getFilterValue() ?? "")}
            onChange={(event) =>
              table.getColumn("code")?.setFilterValue(event.currentTarget.value)
            }
            placeholder="輸入代碼"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">篩選：小組名稱</span>
          <input
            value={String(table.getColumn("name")?.getFilterValue() ?? "")}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.currentTarget.value)
            }
            placeholder="輸入名稱"
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
                <td className="px-3 py-4 text-slate-500" colSpan={6}>
                  目前尚無符合條件的小組資料。
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
    </div>
  );
}
