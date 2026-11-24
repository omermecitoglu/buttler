import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";
import ServiceBuilds from "~/components/services/ServiceBuilds";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";

export default function({ params }: PageProps<"/[locale]/services/[id]/builds">) {
  return (
    <Suspense fallback={<ServicePanelSkeleton />}>
      <Authorized>
        <ServiceBuilds params={params} />
      </Authorized>
    </Suspense>
  );
}
