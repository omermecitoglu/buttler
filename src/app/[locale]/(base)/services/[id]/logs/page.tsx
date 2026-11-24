import { Suspense } from "react";
import ServiceLogs from "~/components/services/ServiceLogs";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";

export default function({ params }: PageProps<"/[locale]/services/[id]/logs">) {
  return (
    <Suspense fallback={<ServicePanelSkeleton />}>
      <ServiceLogs params={params} />
    </Suspense>
  );
}
