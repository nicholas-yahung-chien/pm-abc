"use client";

import { useEffect, useMemo } from "react";

type StatusBannerProps = {
  status?: string;
  message?: string;
};

export function StatusBanner({ status, message }: StatusBannerProps) {
  const hasBanner = Boolean(status && message);
  const isSuccess = status === "success";
  const decodedMessage = useMemo(() => {
    if (!message) return "";
    try {
      return decodeURIComponent(message);
    } catch {
      return message;
    }
  }, [message]);

  useEffect(() => {
    if (!hasBanner) return;

    const currentUrl = new URL(window.location.href);
    if (
      !currentUrl.searchParams.has("status") &&
      !currentUrl.searchParams.has("message")
    ) {
      return;
    }

    currentUrl.searchParams.delete("status");
    currentUrl.searchParams.delete("message");
    const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [hasBanner]);

  if (!hasBanner) return null;

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-rose-300 bg-rose-50 text-rose-800"
      }`}
    >
      {decodedMessage}
    </div>
  );
}
