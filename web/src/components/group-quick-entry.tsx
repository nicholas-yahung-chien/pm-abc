"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type GroupQuickEntryOption = {
  id: string;
  label: string;
};

type GroupQuickEntryProps = {
  title: string;
  description: string;
  options: GroupQuickEntryOption[];
};

export function GroupQuickEntry({ title, description, options }: GroupQuickEntryProps) {
  const router = useRouter();
  const defaultValue = useMemo(() => options[0]?.id ?? "", [options]);
  const [groupId, setGroupId] = useState(defaultValue);

  if (!options.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <p className="mt-3 text-sm text-slate-500">目前尚無可進入的小組。</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">選擇小組</span>
          <select value={groupId} onChange={(event) => setGroupId(event.currentTarget.value)}>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="md:self-end">
          <button
            type="button"
            disabled={!groupId}
            onClick={() => router.push(`/groups/${groupId}`)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
          >
            進入小組
          </button>
        </div>
      </div>
    </section>
  );
}