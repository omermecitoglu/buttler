import { Suspense } from "react";
import ServicesHeader from "~/components/ServicesHeader";
import ServicesList from "~/components/ServicesList";
import ServicesSkeleton from "~/components/ServicesSkeleton";

export default function(_page: PageProps<"/[locale]/services">) {
  return (
    <div className="flex flex-col">
      <ServicesHeader />
      <Suspense fallback={<ServicesSkeleton />}>
        <ServicesList />
      </Suspense>
    </div>
  );
}
