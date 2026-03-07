"use client";

import { Plus, X } from "lucide-react";
import { type ReactNode, useState } from "react";

type FormModalTriggerProps = {
  buttonLabel: string;
  modalTitle: string;
  modalDescription?: string;
  submitLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  triggerClassName?: string;
  formClassName?: string;
  submitClassName?: string;
  actionsClassName?: string;
};

export function FormModalTrigger({
  buttonLabel,
  modalTitle,
  modalDescription,
  submitLabel,
  action,
  children,
  triggerClassName,
  formClassName = "space-y-3",
  submitClassName = "rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700",
  actionsClassName,
}: FormModalTriggerProps) {
  const [open, setOpen] = useState(false);

  const submit = async (formData: FormData) => {
    setOpen(false);
    await action(formData);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
        }
      >
        <Plus className="h-4 w-4" />
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{modalTitle}</h3>
                {modalDescription && (
                  <p className="mt-1 text-sm text-slate-600">{modalDescription}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
                title="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={submit} className={`mt-4 ${formClassName}`}>
              {children}

              <div className={["flex justify-end gap-2", actionsClassName ?? ""].join(" ").trim()}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  取消
                </button>
                <button className={submitClassName}>{submitLabel}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
