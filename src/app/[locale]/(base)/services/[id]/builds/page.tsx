import { Suspense } from "react";
import ServiceBuilds from "~/components/services/ServiceBuilds";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";

export default function({ params }: PageProps<"/[locale]/services/[id]/builds">) {
  return (
    <Suspense fallback={<ServicePanelSkeleton />}>
      <ServiceBuilds params={params} />
    </Suspense>
  );
}
