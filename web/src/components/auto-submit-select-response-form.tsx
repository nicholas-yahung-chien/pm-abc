"use client";

import { useRef } from "react";

type ActionHandler = (formData: FormData) => void | Promise<void>;

type AutoSubmitSelectResponseFormProps = {
  action: ActionHandler;
  groupId: string;
  itemId: string;
  personId: string;
  returnTo: string;
  options: string[];
  defaultValue: string;
};

export function AutoSubmitSelectResponseForm({
  action,
  groupId,
  itemId,
  personId,
  returnTo,
  options,
  defaultValue,
}: AutoSubmitSelectResponseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasCurrentOption = defaultValue ? options.includes(defaultValue) : true;

  const handleChange = () => {
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={action} className="mx-auto flex items-center justify-center">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="isCompleted" value="false" />
      <input type="hidden" name="numberValue" value="" />
      <input type="hidden" name="dateValue" value="" />
      <select
        name="selectValue"
        defaultValue={defaultValue}
        onChange={handleChange}
        className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
        title="請選擇選項，變更後會自動儲存"
      >
        <option value="">未選擇</option>
        {!hasCurrentOption && defaultValue ? (
          <option value={defaultValue}>{defaultValue}（舊值）</option>
        ) : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </form>
  );
}

