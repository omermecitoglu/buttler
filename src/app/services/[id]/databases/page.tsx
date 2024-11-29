import PageSection from "@omer-x/bs-ui-kit/PageSection";
import { notFound } from "next/navigation";
import React from "react";
import BackButton from "~/components/BackButton";
import db from "~/database";
import getService from "~/operations/getService";

type ServiceDatabasesPageProps = {
  params: {
    locale: string,
    id: string,
  },
};

const ServiceDatabasesPage = async ({
  params,
}: ServiceDatabasesPageProps) => {
  const service = await getService(db, params.id);
  if (!service) notFound();
  return (
    <PageSection
      title={`Databases of ${service.name}`}
      toolbar={(
        <>
          <BackButton fallback={`/services/${params.id}`} />
        </>
      )}
    >
      <span className="text-muted fst-italic">
        No databases attached to this service.
      </span>
    </PageSection>
  );
};

export default ServiceDatabasesPage;
