import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import DataTable from "@omer-x/bs-ui-kit/DataTable";
import PageSection from "@omer-x/bs-ui-kit/PageSection";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { attachDatabase, detachDatabase } from "~/actions/service";
import BackButton from "~/components/BackButton";
import ModalList from "~/components/ModalList";
import db from "~/database";
import getService from "~/operations/getService";
import getServices from "~/operations/getServices";
import { pluck } from "~/utils/object";

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
  const alreadyProvidedDatabases = pluck(service.providers, "id");
  const allDatabases = allServices.filter(s => (s.kind === "database" && !alreadyProvidedDatabases.includes(s.id)));
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
      {service.providers.length ? (
        <DataTable
          link={Link}
          collection={service.providers}
          primaryKey="id"
          schema={{
            name: {
              header: "Name",
            },
          }}
          destroyAction={detachDatabase.bind(null, service.id)}
          destroyWarningTitle="Delete Service"
          destroyWarningDescription="Are you sure you want to detach this database?"
          destroyConfirmText="Confirm"
          destroyCancelText="Cancel"
          destroyDisabled={false}
        />
      ) : (
        <span className="text-muted fst-italic">
          No databases attached to this service.
        </span>
      )}
    </PageSection>
  );
};

export default ServiceDatabasesPage;
