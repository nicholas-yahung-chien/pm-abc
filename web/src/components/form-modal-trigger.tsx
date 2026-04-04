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
  triggerContent?: ReactNode;
  triggerClassName?: string;
  formClassName?: string;
  submitClassName?: string;
  actionsClassName?: string;
  disabled?: boolean;
};

export function FormModalTrigger({
  buttonLabel,
  modalTitle,
  modalDescription,
  submitLabel,
  action,
  children,
  triggerContent,
  triggerClassName,
  formClassName = "space-y-3",
  submitClassName = "btn-primary",
  actionsClassName,
  disabled = false,
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
        disabled={disabled}
        aria-label={buttonLabel}
        title={buttonLabel}
        className={[
          triggerClassName ??
            "inline-flex items-center gap-2 btn-primary",
          "disabled:cursor-not-allowed disabled:bg-slate-400",
        ].join(" ")}
      >
        {triggerContent ?? (
          <>
            <Plus className="h-4 w-4" />
            {buttonLabel}
          </>
        )}
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
                title={"\u95dc\u9589"}
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
                  {"\u53d6\u6d88"}
                </button>
                <button
                  disabled={disabled}
                  className={[
                    submitClassName,
                    "disabled:cursor-not-allowed disabled:bg-slate-400",
                  ].join(" ")}
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
