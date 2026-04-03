"use client";

import { useRef, useState } from "react";
import { createGroupPollAction } from "@/app/group-comms-actions";

type PollOption = { label: string; slot: string };

export function PollCreateForm({ groupId }: { groupId: string }) {
  const [pollType, setPollType] = useState<"topic" | "time">("topic");
  const [options, setOptions] = useState<PollOption[]>([
    { label: "", slot: "" },
    { label: "", slot: "" },
  ]);
  const formRef = useRef<HTMLFormElement>(null);

  function addOption() {
    setOptions((prev) => [...prev, { label: "", slot: "" }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOption(index: number, field: keyof PollOption, value: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)),
    );
  }

  return (
    <form ref={formRef} action={createGroupPollAction} className="mt-3 space-y-3">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="text"
          name="title"
          placeholder="投票標題"
          required
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          name="pollType"
          value={pollType}
          onChange={(e) => setPollType(e.target.value as "topic" | "time")}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="topic">議題投票（單選）</option>
          <option value="time">時間投票（可複選）</option>
        </select>
      </div>

      <input
        type="text"
        name="description"
        placeholder="說明（選填）"
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
      />

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">截止時間</label>
        <input
          type="datetime-local"
          name="expiresAt"
          required
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      {/* Dynamic options */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">
          選項（至少 2 個）
          {pollType === "time" && (
            <span className="ml-1 font-normal text-slate-400">— 請填寫各時段的日期與時間</span>
          )}
        </p>

        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              name={`optionLabel_${i}`}
              value={opt.label}
              onChange={(e) => updateOption(i, "label", e.target.value)}
              placeholder={pollType === "time" ? `時段 ${i + 1} 說明（選填）` : `選項 ${i + 1}`}
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            {pollType === "time" ? (
              <input
                type="datetime-local"
                name={`optionSlot_${i}`}
                value={opt.slot}
                onChange={(e) => updateOption(i, "slot", e.target.value)}
                required
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            ) : (
              // Keep a hidden input so index alignment is preserved server-side
              <input type="hidden" name={`optionSlot_${i}`} value="" />
            )}
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              刪除
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addOption}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          + 新增選項
        </button>
      </div>

      <button
        type="submit"
        className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
      >
        建立投票
      </button>
    </form>
  );
}
