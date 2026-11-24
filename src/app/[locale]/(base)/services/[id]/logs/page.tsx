import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";
import ServiceLogs from "~/components/services/ServiceLogs";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";

export default function({ params }: PageProps<"/[locale]/services/[id]/logs">) {
  return (
    <Suspense fallback={<ServicePanelSkeleton />}>
      <Authorized>
        <ServiceLogs params={params} />
      </Authorized>
    </Suspense>
  );
}
