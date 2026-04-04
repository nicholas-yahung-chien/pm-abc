import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/page-skeleton";

export default function GroupsLoading() {
  return (
    <AppShell>
      <PageSkeleton contentVariant="table" cols={4} rows={6} />
    </AppShell>
  );
}
