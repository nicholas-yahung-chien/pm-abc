import Link from "next/link";

type GroupFeatureKey = "tracking" | "study" | "courses" | "directory" | "roles";

type GroupFeatureNavBarProps = {
  groupId: string;
  classId: string;
  current: GroupFeatureKey;
};

const featureItems: Array<{ key: GroupFeatureKey; label: string }> = [
  { key: "tracking", label: "追蹤表" },
  { key: "study", label: "讀書會" },
  { key: "courses", label: "課程表" },
  { key: "directory", label: "通訊錄" },
  { key: "roles", label: "R&R" },
];

export function GroupFeatureNavBar({ groupId, classId, current }: GroupFeatureNavBarProps) {
  const hrefByKey: Record<GroupFeatureKey, string> = {
    tracking: `/groups/${groupId}`,
    study: `/groups/${groupId}/study`,
    courses: `/classes/${classId}/courses`,
    directory: `/groups/${groupId}/directory`,
    roles: `/groups/${groupId}/roles`,
  };

  return (
    <section className="sticky top-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <nav className="flex flex-nowrap gap-2 overflow-x-auto">
        {featureItems.map((item) => {
          const isActive = item.key === current;
          return (
            <Link
              key={item.key}
              href={hrefByKey[item.key]}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex shrink-0 items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? "border-amber-600 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
