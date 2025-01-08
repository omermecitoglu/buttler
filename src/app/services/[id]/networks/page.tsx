import { faPlug } from "@fortawesome/free-solid-svg-icons/faPlug";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import ActionButton from "@omer-x/bs-ui-kit/ActionButton";
import DataTable from "@omer-x/bs-ui-kit/DataTable";
import PageSection from "@omer-x/bs-ui-kit/PageSection";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { connect, create as createNetwork, destroy as destroyNetwork } from "~/actions/service-networks";
import BackButton from "~/components/BackButton";
import ModalList from "~/components/ModalList";
import db from "~/database";
import getNetwork from "~/operations/getNetwork";
import getService from "~/operations/getService";
import { pluck } from "~/utils/object";

type ServiceNetworksPageProps = {
  params: Promise<{ locale: string, id: string }>,
};

const ServiceNetworksPage = async ({
  params,
}: ServiceNetworksPageProps) => {
  const { id: serviceId } = await params;
  const service = await getService(db, serviceId);
  if (!service) notFound();
  const providerNetworkIds = pluck(service.providers, "networkIds").flat();
  const serviceNetworkIds = [providerNetworkIds, service.networkIds].flat();
  const serviceNetworks = await Promise.all(serviceNetworkIds.map(getNetwork.bind(null, db)));
  const allNetworks = await db.query.networks.findMany({
    with: {
      service: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
    columns: {
      id: true,
    },
    where: (n, { eq, ne, and }) => and(eq(n.kind, "custom"), ne(n.serviceId, serviceId)),
  });
  const availableNetworks = Object.fromEntries(allNetworks
    .filter(n => !serviceNetworkIds.includes(n.id))
    .map(n => [n.service.id, n.service.name] as const));
  return (
    <PageSection
      title={`Networks of ${service.name}`}
      toolbar={(
        <>
          <ModalList
            buttonVariant="primary"
            buttonSize="sm"
            buttonIcon={faPlug}
            buttonText="Connect"
            title="Connect to Network"
            collection={availableNetworks}
            emptyWarning="No available networks"
            action={connect.bind(null, serviceId)}
          />
          <ActionButton
            variant="success"
            size="sm"
            icon={faPlus}
            text="Create"
            onClick={createNetwork.bind(null, serviceId)}
          />
          <BackButton fallback={`/services/${serviceId}`} />
        </>
      )}
    >
      {service.providers.length ? (
        <DataTable
          link={Link}
          collection={serviceNetworks.map(sn => ({ ...sn, source: null }))}
          primaryKey="id"
          schema={{
            id: {
              header: "ID",
            },
            kind: {
              header: "Type",
            },
            source: {
              header: "Source",
              wrapper: (_, networkId) => {
                const provider = service.providers.find(sp => sp.networkIds.includes(networkId));
                if (provider) {
                  return (
                    <Link href={`/services/${provider.id}`}>{provider.name}</Link>
                  );
                }
                return undefined;
              },
            },
          }}
          destroyAction={destroyNetwork}
          destroyWarningTitle="Delete Service"
          destroyWarningDescription="Are you sure you want to detach this network?"
          destroyConfirmText="Confirm"
          destroyCancelText="Cancel"
          destroyDisabled={pk => serviceNetworks.find(sn => sn.id === pk)?.kind !== "custom"}
        />
      ) : (
        <span className="text-muted fst-italic">
          No networks attached to this service.
        </span>
      )}
    </PageSection>
  );
};

export default ServiceNetworksPage;
