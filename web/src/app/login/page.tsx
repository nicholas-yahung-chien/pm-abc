import type { CSSProperties } from "react";
import Link from "next/link";
import { Briefcase, Shield, UserRound } from "lucide-react";
import { StatusBanner } from "@/components/status-banner";
import { AuthShell } from "@/components/auth-shell";
import { pickSearchParam } from "@/lib/search";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const identities = [
  {
    href: "/login/member",
    title: "學員登入",
    subtitle: "Email OTP",
    icon: UserRound,
    circleClass: "bg-red-700",
  },
  {
    href: "/login/coach",
    title: "教練登入",
    subtitle: "登入 / 註冊",
    icon: Briefcase,
    circleClass: "bg-red-700",
  },
  {
    href: "/login/admin",
    title: "管理員登入",
    subtitle: "系統管理",
    icon: Shield,
    circleClass: "bg-slate-800",
  },
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = pickSearchParam(params.status);
  const message = pickSearchParam(params.message);

  return (
    <AuthShell
      title="登入 PM-ABC 平台"
      description="請選擇您的身份進行登入。"
      layout="selector"
    >
      <StatusBanner status={status} message={message} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
        <div
          className="grid gap-3 md:gap-0 md:[grid-template-columns:repeat(var(--identity-cols),minmax(0,1fr))]"
          style={{ "--identity-cols": identities.length } as CSSProperties}
        >
          {identities.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "group flex min-h-72 flex-col items-center justify-center gap-5 px-6 py-10 text-center transition hover:bg-white",
                  index > 0 ? "md:border-l md:border-dashed md:border-slate-300" : "",
                ].join(" ")}
              >
                <div
                  className={`flex h-32 w-32 items-center justify-center rounded-full ${item.circleClass} text-white shadow-lg shadow-slate-300/50`}
                >
                  <Icon className="h-14 w-14" />
                </div>
                <div className="space-y-2">
                  <p className="text-5xl font-light tracking-wide text-slate-600 group-hover:text-slate-800">
                    {item.title}
                  </p>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    {item.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AuthShell>
  );
}
