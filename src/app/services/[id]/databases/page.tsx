import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import PageSection from "@omer-x/bs-ui-kit/PageSection";
import { notFound } from "next/navigation";
import React from "react";
import { attachDatabase } from "~/actions/service";
import BackButton from "~/components/BackButton";
import ModalList from "~/components/ModalList";
import db from "~/database";
import getService from "~/operations/getService";
import getServices from "~/operations/getServices";

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
  const allServices = await getServices(db, ["id", "kind", "name"]);
  const allDatabases = allServices.filter(s => s.kind === "database");
  const availableDatabases = Object.fromEntries(allDatabases.map(s => [s.id, s.name] as const));
  return (
    <PageSection
      title={`Databases of ${service.name}`}
      toolbar={(
        <>
          <ModalList
            buttonVariant="success"
            buttonSize="sm"
            buttonIcon={faPlus}
            buttonText="Add"
            title="Add database"
            collection={availableDatabases}
            emptyWarning="No available database"
            action={attachDatabase.bind(null, params.id)}
          />
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
