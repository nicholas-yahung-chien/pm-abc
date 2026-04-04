import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/page-skeleton";

export default function PollsLoading() {
  return (
    <AppShell>
      <PageSkeleton showNav contentVariant="card" rows={3} />
    </AppShell>
  );
}
