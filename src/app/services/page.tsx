import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import DataTable from "@omer-x/bs-ui-kit/DataTable";
import PageTitle from "@omer-x/bs-ui-kit/PageTitle";
import ModalForm from "@omer-x/bs-ui-kit/form/ModalForm";
import Link from "next/link";
import React from "react";
import { create, destroy } from "~/actions/service";
import ServiceBadge from "~/components/services/ServiceBadge";
import ServiceForm from "~/components/services/ServiceForm";
import db from "~/database";
import getServices from "~/operations/getServices";

type ServicesPageProps = {
  params: {
    locale: string,
  },
};

const ServicesPage = async ({
  params: _params,
}: ServicesPageProps) => {
  const services = await getServices(db, ["id", "name", "status"]);

  return (
    <>
      <PageTitle name="Services">
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
      </PageTitle>
      {services.length ? (
        <DataTable
          link={Link}
          collection={services}
          primaryKey="id"
          schema={{
            name: {
              header: "Name",
              wrapper: (value, pk) => <Link href={`/services/${pk}`}>{value}</Link>,
              long: true,
            },
            status: {
              header: "Status",
              wrapper: value => <ServiceBadge status={value} />,
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
    </>
  );
};

export default ServicesPage;
