"use client";

import { useMemo, useState } from "react";
import { TableEmptyRow } from "@/components/empty-state";

type GroupOption = {
  id: string;
  label: string;
};

type GroupMembershipRow = {
  id: string;
  groupId: string;
  groupLabel: string;
  memberLabel: string;
  membershipTypeLabel: string;
  roleLabel: string;
};

type GroupMembershipListProps = {
  groups: GroupOption[];
  rows: GroupMembershipRow[];
};

export function GroupMembershipList({ groups, rows }: GroupMembershipListProps) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const activeGroupId = groups.some((group) => group.id === selectedGroupId)
    ? selectedGroupId
    : (groups[0]?.id ?? "");

  const selectedGroupRows = useMemo(
    () => rows.filter((item) => item.groupId === activeGroupId),
    [rows, activeGroupId],
  );

  return (
    <div className="mt-4 space-y-4">
      <label className="block max-w-md space-y-1">
        <span className="text-sm font-medium text-slate-700">切換查看小組</span>
        <select
          value={activeGroupId}
          onChange={(event) => setSelectedGroupId(event.currentTarget.value)}
          disabled={!groups.length}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.label}
            </option>
          ))}
          {!groups.length && <option value="">目前尚無小組</option>}
        </select>
      </label>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">小組</th>
              <th className="px-3 py-2">學員</th>
              <th className="px-3 py-2">成員類型</th>
              <th className="px-3 py-2">組內角色</th>
            </tr>
          </thead>
          <tbody>
            {selectedGroupRows.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{item.groupLabel}</td>
                <td className="px-3 py-2">{item.memberLabel}</td>
                <td className="px-3 py-2">{item.membershipTypeLabel}</td>
                <td className="px-3 py-2">{item.roleLabel}</td>
              </tr>
            ))}
            {!selectedGroupRows.length && (
              <TableEmptyRow colSpan={4} message="目前所選小組尚無成員指派資料。" />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
