"use client";

import { useRef } from "react";

type ActionHandler = (formData: FormData) => void | Promise<void>;

type AutoSubmitNumberResponseFormProps = {
  action: ActionHandler;
  groupId: string;
  itemId: string;
  personId: string;
  returnTo: string;
  defaultValue: string;
};

export function AutoSubmitNumberResponseForm({
  action,
  groupId,
  itemId,
  personId,
  returnTo,
  defaultValue,
}: AutoSubmitNumberResponseFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);

  const handleBlur = (value: string) => {
    const normalized = value.trim();
    if (normalized === lastSubmittedValueRef.current) return;
    lastSubmittedValueRef.current = normalized;
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={action} className="mx-auto flex w-full items-center justify-center">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="isCompleted" value="false" />
      <input type="hidden" name="dateValue" value="" />
      <input type="hidden" name="selectValue" value="" />
      <input
        name="numberValue"
        type="number"
        step="0.01"
        defaultValue={defaultValue}
        onBlur={(event) => handleBlur(event.currentTarget.value)}
        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center text-xs"
        title="請輸入數值，離開欄位後會自動儲存"
      />
    </form>
  );
}

