import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/page-skeleton";

export default function GroupDetailLoading() {
  return (
    <AppShell>
      <PageSkeleton showNav contentVariant="table" cols={5} rows={8} />
    </AppShell>
  );
}
