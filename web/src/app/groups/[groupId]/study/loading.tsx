import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/page-skeleton";

export default function StudyLoading() {
  return (
    <AppShell>
      <PageSkeleton showNav contentVariant="card" rows={4} />
    </AppShell>
  );
}
