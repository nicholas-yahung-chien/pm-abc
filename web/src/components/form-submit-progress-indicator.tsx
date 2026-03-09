"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const FAILSAFE_MS = 15000;
const MIN_VISIBLE_MS = 1000;

type FormLockSnapshot = {
  pointerEvents: string;
  opacity: string;
  ariaBusy: string | null;
  pendingAttr: string | null;
};

function lockForm(form: HTMLFormElement): FormLockSnapshot {
  const snapshot: FormLockSnapshot = {
    pointerEvents: form.style.pointerEvents,
    opacity: form.style.opacity,
    ariaBusy: form.getAttribute("aria-busy"),
    pendingAttr: form.getAttribute("data-submit-pending"),
  };

  form.style.pointerEvents = "none";
  form.style.opacity = "0.72";
  form.setAttribute("aria-busy", "true");
  form.setAttribute("data-submit-pending", "true");

  return snapshot;
}

function unlockForm(form: HTMLFormElement, snapshot: FormLockSnapshot) {
  form.style.pointerEvents = snapshot.pointerEvents;
  form.style.opacity = snapshot.opacity;

  if (snapshot.ariaBusy === null) {
    form.removeAttribute("aria-busy");
  } else {
    form.setAttribute("aria-busy", snapshot.ariaBusy);
  }

  if (snapshot.pendingAttr === null) {
    form.removeAttribute("data-submit-pending");
  } else {
    form.setAttribute("data-submit-pending", snapshot.pendingAttr);
  }
}

export function FormSubmitProgressIndicator() {
  const [isPending, setIsPending] = useState(false);
  const lockRef = useRef<{ form: HTMLFormElement; snapshot: FormLockSnapshot } | null>(null);
  const shownAtRef = useRef<number | null>(null);
  const failsafeTimerRef = useRef<number | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = useMemo(() => searchParams.toString(), [searchParams]);

  const clearFailsafe = useCallback(() => {
    if (failsafeTimerRef.current !== null) {
      window.clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
  }, []);

  const clearScheduledClear = useCallback(() => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  const unlockCurrentForm = useCallback(() => {
    if (!lockRef.current) return;
    unlockForm(lockRef.current.form, lockRef.current.snapshot);
    lockRef.current = null;
  }, []);

  const clearPendingState = useCallback(() => {
    clearFailsafe();
    clearScheduledClear();
    unlockCurrentForm();
    shownAtRef.current = null;
    setIsPending(false);
  }, [clearFailsafe, clearScheduledClear, unlockCurrentForm]);

  const scheduleClearPendingState = useCallback(
    (forceImmediate = false) => {
      if (!lockRef.current && !isPending) return;

      clearScheduledClear();

      const shownAt = shownAtRef.current ?? Date.now();
      const elapsed = Date.now() - shownAt;
      const delay = forceImmediate ? 0 : Math.max(0, MIN_VISIBLE_MS - elapsed);

      clearTimerRef.current = window.setTimeout(() => {
        clearTimerRef.current = null;
        clearPendingState();
      }, delay);
    },
    [clearPendingState, clearScheduledClear, isPending],
  );

  const beginPendingState = useCallback(
    (form: HTMLFormElement) => {
      clearFailsafe();
      clearScheduledClear();
      unlockCurrentForm();

      lockRef.current = {
        form,
        snapshot: lockForm(form),
      };
      shownAtRef.current = Date.now();
      setIsPending(true);

      failsafeTimerRef.current = window.setTimeout(() => {
        scheduleClearPendingState(true);
      }, FAILSAFE_MS);
    },
    [clearFailsafe, clearScheduledClear, unlockCurrentForm, scheduleClearPendingState],
  );

  useEffect(() => {
    const onSubmit = (event: Event) => {
      if (event.defaultPrevented) return;
      if (lockRef.current) return;

      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (target.hasAttribute("data-skip-submit-pending")) return;

      beginPendingState(target);
    };

    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [beginPendingState]);

  useEffect(() => {
    if (!isPending) return;
    scheduleClearPendingState(false);
  }, [pathname, searchKey, isPending, scheduleClearPendingState]);

  useEffect(
    () => () => {
      clearFailsafe();
      clearScheduledClear();
      unlockCurrentForm();
      shownAtRef.current = null;
    },
    [clearFailsafe, clearScheduledClear, unlockCurrentForm],
  );

  if (!isPending) return null;

  return (
    <div
      className="pointer-events-none fixed right-5 bottom-5 z-[130]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg">
        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
        <div>
          <p className="font-semibold">已送出，處理中...</p>
          <p className="text-xs text-amber-800">請稍候，完成後會顯示結果訊息。</p>
        </div>
      </div>
    </div>
  );
}
