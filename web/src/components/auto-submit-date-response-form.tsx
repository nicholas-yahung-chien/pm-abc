"use client";

import { useRef } from "react";

type ActionHandler = (formData: FormData) => void | Promise<void>;

type AutoSubmitDateResponseFormProps = {
  action: ActionHandler;
  groupId: string;
  itemId: string;
  personId: string;
  returnTo: string;
  defaultValue: string;
};

export function AutoSubmitDateResponseForm({
  action,
  groupId,
  itemId,
  personId,
  returnTo,
  defaultValue,
}: AutoSubmitDateResponseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleDateChange = () => {
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
      <input type="hidden" name="selectValue" value="" />
      <input
        name="dateValue"
        type="date"
        defaultValue={defaultValue}
        onChange={handleDateChange}
        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
        title="選擇日期後自動儲存"
      />
    </form>
  );
}

