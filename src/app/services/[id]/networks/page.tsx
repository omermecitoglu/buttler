import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import ActionButton from "@omer-x/bs-ui-kit/ActionButton";
import DataTable from "@omer-x/bs-ui-kit/DataTable";
import PageSection from "@omer-x/bs-ui-kit/PageSection";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { create as createNetwork, destroy as destroyNetwork } from "~/actions/service-networks";
import BackButton from "~/components/BackButton";
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
  return (
    <PageSection
      title={`Networks of ${service.name}`}
      toolbar={(
        <>
          <ActionButton
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
