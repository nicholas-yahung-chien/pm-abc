/**
 * Reusable skeleton shimmer blocks for loading.tsx files.
 * Matches the compact management-style layout of the app shell.
 */

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 ${className ?? ""}`}
    />
  );
}

/** Header card skeleton — matches the amber-label + h1 + description pattern */
export function HeaderCardSkeleton() {
  return (
    <div className="card-section">
      <Shimmer className="h-3 w-24" />
      <Shimmer className="mt-2 h-7 w-48" />
      <Shimmer className="mt-2 h-4 w-72" />
    </div>
  );
}

/** Generic content card skeleton with configurable row count */
export function ContentCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <Shimmer className="h-4 w-32" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <Shimmer className="h-4 w-4 shrink-0 rounded-full" />
            <Shimmer className="h-4 flex-1" />
            <Shimmer className="h-4 w-24 shrink-0" />
            <Shimmer className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table skeleton with configurable column and row count */
export function TableSkeleton({
  cols = 4,
  rows = 6,
}: {
  cols?: number;
  rows?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Fake table header */}
      <div className="flex gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Fake rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-slate-100 px-5 py-3 last:border-0"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Shimmer key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full page skeleton: header + optional nav strip + content cards */
export function PageSkeleton({
  showNav = false,
  contentVariant = "table",
  rows,
  cols,
}: {
  showNav?: boolean;
  contentVariant?: "table" | "card";
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-5">
      <HeaderCardSkeleton />
      {showNav && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2">
            {["w-20", "w-16", "w-18", "w-14", "w-12", "w-14"].map((w, i) => (
              <Shimmer key={i} className={`h-7 ${w} rounded-lg`} />
            ))}
          </div>
        </div>
      )}
      {contentVariant === "table" ? (
        <TableSkeleton rows={rows} cols={cols} />
      ) : (
        <ContentCardSkeleton rows={rows} />
      )}
    </div>
  );
}
