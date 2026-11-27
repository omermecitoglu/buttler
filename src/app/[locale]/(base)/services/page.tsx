import { Suspense } from "react";
import ExportServices from "~/components/ExportServices";
import ImportServices from "~/components/ImportServices";
import ServicesHeader from "~/components/ServicesHeader";
import ServicesList from "~/components/ServicesList";
import ServicesSkeleton from "~/components/ServicesSkeleton";
import Authorized from "~/components/auth/Authorized";

export default function(_page: PageProps<"/[locale]/services">) {
  return (
    <div className="flex flex-col">
      <ServicesHeader
        importButton={(
          <Suspense fallback={null}>
            <ImportServices />
          </Suspense>
        )}
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
