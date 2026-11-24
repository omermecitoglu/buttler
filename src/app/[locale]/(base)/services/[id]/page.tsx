import { Suspense } from "react";
import ServiceInfo from "~/components/services/ServiceInfo";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";

export default function({ params }: PageProps<"/[locale]/services/[id]">) {
  return (
    <Suspense fallback={<ServicePanelSkeleton />}>
      <ServiceInfo params={params} />
    </Suspense>
  );
}
