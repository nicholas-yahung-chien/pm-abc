import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/page-skeleton";

export default function NotificationsLoading() {
  return (
    <AppShell>
      <PageSkeleton contentVariant="table" cols={8} rows={10} />
    </AppShell>
  );
}
