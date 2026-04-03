"use client";

import { useState } from "react";
import { createGroupPollAction } from "@/app/group-comms-actions";

type PollOption = { slot: string };

export function PollCreateForm({ groupId }: { groupId: string }) {
  const [pollType, setPollType] = useState<"topic" | "time">("topic");
  const [timeSubType, setTimeSubType] = useState<"date" | "datetime">("datetime");
  const [options, setOptions] = useState<PollOption[]>([{ slot: "" }, { slot: "" }]);

  function addOption() {
    setOptions((prev) => [...prev, { slot: "" }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { slot: value } : opt)));
  }

  function handlePollTypeChange(value: "topic" | "time") {
    setPollType(value);
    // Reset slots when switching type to avoid stale values
    setOptions([{ slot: "" }, { slot: "" }]);
  }

  return (
    <form action={createGroupPollAction} className="mt-3 space-y-3">
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
          onChange={(e) => handlePollTypeChange(e.target.value as "topic" | "time")}
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

      {/* Time sub-type toggle — only visible when poll type is "time" */}
      {pollType === "time" && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">時段格式</span>
          <div className="flex rounded-md border border-slate-300 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeSubType("date")}
              className={`px-3 py-1.5 transition-colors ${
                timeSubType === "date"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              僅日期
            </button>
            <button
              type="button"
              onClick={() => setTimeSubType("datetime")}
              className={`px-3 py-1.5 border-l border-slate-300 transition-colors ${
                timeSubType === "datetime"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              日期 + 時間
            </button>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">
          {pollType === "topic" ? "選項（至少 2 個）" : `時段（至少 2 個，${timeSubType === "date" ? "選擇日期" : "選擇日期與時間"}）`}
        </p>

        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            {pollType === "topic" ? (
              <>
                {/* Topic poll: text label only, no slot */}
                <input
                  type="text"
                  name={`optionLabel_${i}`}
                  placeholder={`選項 ${i + 1}`}
                  required
                  className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                />
                <input type="hidden" name={`optionSlot_${i}`} value="" />
              </>
            ) : (
              <>
                {/* Time poll: date or datetime picker only — value becomes the label too */}
                <input
                  type={timeSubType === "date" ? "date" : "datetime-local"}
                  name={`optionSlot_${i}`}
                  value={opt.slot}
                  onChange={(e) => updateSlot(i, e.target.value)}
                  required
                  className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                />
                {/* Label mirrors the slot value so server always receives it */}
                <input type="hidden" name={`optionLabel_${i}`} value={opt.slot} />
              </>
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
          + 新增時段
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
