import { faGitAlt } from "@fortawesome/free-brands-svg-icons/faGitAlt";
import { faDatabase } from "@fortawesome/free-solid-svg-icons/faDatabase";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons/faScrewdriverWrench";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import DataTable from "@omer-x/bs-ui-kit/DataTable";
import PageSection from "@omer-x/bs-ui-kit/PageSection";
import ModalForm from "@omer-x/bs-ui-kit/form/ModalForm";
import Link from "next/link";
import React from "react";
import { create, destroy } from "~/actions/service";
import ServiceBadge from "~/components/services/ServiceBadge";
import ServiceForm from "~/components/services/ServiceForm";
import db from "~/database";
import getServices from "~/operations/getServices";

export const dynamic = "force-dynamic";

type ServicesPageProps = {
  params: Promise<{ locale: string }>,
};

const ServicesPage = async ({
  params: _params,
}: ServicesPageProps) => {
  const allServices = await getServices(db, ["id", "kind", "name", "status", "ports", "environmentVariables"]);
  const services = allServices.filter(service => service.kind !== "system");

  const getTypeIcon = (kind: typeof services[number]["kind"]) => {
    switch (kind) {
      case "system": return faScrewdriverWrench;
      case "git": return faGitAlt;
      case "database": return faDatabase;
    }
  };

  return (
    <PageSection
      title="Services"
      toolbar={(
        <ModalForm
          buttonIcon={faPlus}
          buttonSize="sm"
          buttonText="New Service"
          buttonVariant="success"
          title="New Service"
          action={create}
          confirmText="Create"
          cancelText="Cancel"
        >
          <ServiceForm />
        </ModalForm>
      )}
    >
      {services.length ? (
        <DataTable
          link={Link}
          collection={services}
          primaryKey="id"
          schema={{
            kind: {
              header: "",
              wrapper: value => <FontAwesomeIcon icon={getTypeIcon(value)} size="lg" className="fa-fw" />,
            },
            name: {
              header: "Name",
              wrapper: (value, pk) => <Link href={`/services/${pk}`}>{value}</Link>,
              long: true,
            },
            status: {
              header: "Status",
              wrapper: value => <ServiceBadge status={value} />,
            },
            ports: {
              header: "Ports",
              wrapper: value => value.length,
              size: "sm",
            },
            environmentVariables: {
              header: "Env. Variables",
              wrapper: value => value.length,
              size: "md",
            },
          }}
          editLink={pk => `/services/${pk}/edit?r=list`}
          destroyAction={destroy}
          destroyWarningTitle="Delete Service"
          destroyWarningDescription="Are you sure you want to delete this service?"
          destroyConfirmText="Confirm"
          destroyCancelText="Cancel"
          destroyDisabled={false}
        />
      ) : (
        <span className="text-muted fst-italic">
          No services found.
        </span>
      )}
    </PageSection>
  );
};

export default ServicesPage;
