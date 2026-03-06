export function AuthShell({
  title,
  description,
  children,
  layout = "form",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  layout?: "form" | "selector";
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10 md:px-6">
      <section
        className={[
          "w-full rounded-[28px] border border-slate-200/90 bg-white/95 p-6 shadow-xl shadow-slate-200/70 backdrop-blur md:p-8",
          layout === "selector" ? "max-w-6xl" : "max-w-2xl",
        ].join(" ")}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          PM-ABC
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">{description}</p>
        <div className="mt-6 space-y-5">{children}</div>
      </section>
    </main>
  );
}
