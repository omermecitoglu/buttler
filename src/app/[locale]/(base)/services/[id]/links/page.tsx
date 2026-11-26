import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";
import ServiceLinks from "~/components/services/ServiceLinks";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";

export default function({ params }: PageProps<"/[locale]/services/[id]/links">) {
  return (
    <Suspense fallback={<ServicePanelSkeleton />}>
      <Authorized>
        <ServiceLinks params={params} />
      </Authorized>
    </Suspense>
  );
}
