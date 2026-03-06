type StatusBannerProps = {
  status?: string;
  message?: string;
};

export function StatusBanner({ status, message }: StatusBannerProps) {
  if (!status || !message) return null;

  const isSuccess = status === "success";

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-rose-300 bg-rose-50 text-rose-800"
      }`}
    >
      {decodeURIComponent(message)}
    </div>
  );
}

