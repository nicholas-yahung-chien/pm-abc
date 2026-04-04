type PageHeaderProps = {
  /** Amber breadcrumb label above the title (e.g. "管理員" or "班別管理 / 課程表") */
  label?: string;
  title: string;
  description?: string;
  /** StatusBanner, action buttons, or any extra content below the description */
  children?: React.ReactNode;
};

export function PageHeader({ label, title, description, children }: PageHeaderProps) {
  return (
    <section className="card-section">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          {label}
        </p>
      )}
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}
