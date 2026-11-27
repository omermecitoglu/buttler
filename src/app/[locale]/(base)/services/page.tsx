import { Suspense } from "react";
import ExportServices from "~/components/ExportServices";
import ServicesHeader from "~/components/ServicesHeader";
import ServicesList from "~/components/ServicesList";
import ServicesSkeleton from "~/components/ServicesSkeleton";
import Authorized from "~/components/auth/Authorized";

export default function(_page: PageProps<"/[locale]/services">) {
  return (
    <div className="flex flex-col">
      <ServicesHeader
        exportButton={(
          <Suspense fallback={null}>
            <Authorized>
              <ExportServices />
            </Authorized>
          </Suspense>
        )}
      />
      <Suspense fallback={<ServicesSkeleton />}>
        <Authorized>
          <ServicesList />
        </Authorized>
      </Suspense>
    </div>
  );
}
