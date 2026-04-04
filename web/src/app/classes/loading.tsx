import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/page-skeleton";

export default function ClassesLoading() {
  return (
    <AppShell>
      <PageSkeleton contentVariant="table" cols={4} rows={5} />
    </AppShell>
  );
}
