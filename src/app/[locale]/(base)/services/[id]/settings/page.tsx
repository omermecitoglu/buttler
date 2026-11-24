import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";
import ServiceSettings from "~/components/services/ServiceSettings";

export default function({ params }: PageProps<"/[locale]/services/[id]/settings">) {
  return (
    <Suspense fallback={<ServicePanelSkeleton />}>
      <Authorized adminOnly>
        <ServiceSettings params={params} />
      </Authorized>
    </Suspense>
  );
}
