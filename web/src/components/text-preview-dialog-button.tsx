"use client";

import { Eye, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

type TextPreviewDialogButtonProps = {
  title: string;
  text: string;
  emptyText?: string;
  placeholder?: string;
  maxLen?: number;
};

function previewText(value: string, maxLen: number) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}...`;
}

export function TextPreviewDialogButton({
  title,
  text,
  emptyText = "尚未填寫內容。",
  placeholder = "查看內容",
  maxLen = 28,
}: TextPreviewDialogButtonProps) {
  const [open, setOpen] = useState(false);
  const isBrowser = typeof window !== "undefined";

  const dialog = open ? (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100"
            title="關閉"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {text.trim() ? text : emptyText}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
        title={placeholder}
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="max-w-44 truncate">{previewText(text, maxLen)}</span>
      </button>

      {isBrowser && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
