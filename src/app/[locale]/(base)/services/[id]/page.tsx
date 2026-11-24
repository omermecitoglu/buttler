import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";
import ServiceInfo from "~/components/services/ServiceInfo";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";

export default function({ params }: PageProps<"/[locale]/services/[id]">) {
  return (
    <Suspense fallback={<ServicePanelSkeleton />}>
      <Authorized>
        <ServiceInfo params={params} />
      </Authorized>
    </Suspense>
  );
}
