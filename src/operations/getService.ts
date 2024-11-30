import type database from "~/database";
import type { ServiceDTO } from "~/models/service";
import { pluck } from "~/utils/object";
import type z from "zod";

export default async function getService(db: typeof database, serviceId: string) {
  const service = await db.query.services.findFirst({
    with: {
      environmentVariables: {
        columns: {
          key: true,
          value: true,
        },
      },
      ports: {
        columns: {
          external: true,
          internal: true,
        },
      },
      volumes: {
        columns: {
          id: true,
          containerPath: true,
        },
      },
      networks: {
        columns: {
          id: true,
        },
      },
      links: {
        columns: {},
        with: {
          provider: {
            columns: {
              id: true,
              name: true,
            },
            with: {
              networks: {
                columns: {
                  id: true,
                },
              },
              environmentVariables: {
                columns: {
                  key: true,
                  value: true,
                },
              },
            },
          },
        },
      },
      clientLinks: {
        columns: {},
        with: {
          service: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    where: (table, { eq }) => eq(table.id, serviceId),
  });
  if (!service) return null;
  const { ports, environmentVariables, volumes, networks, links, clientLinks, ...others } = service;
  return {
    ...others,
    environmentVariables: Object.fromEntries(environmentVariables.map(({ key, value }) => [key, value] as const)),
    ports: Object.fromEntries(ports.map(({ external, internal }) => [external, internal.toString()] as const)),
    volumes: Object.fromEntries(volumes.map(({ id, containerPath }) => [id, containerPath] as const)),
    networkIds: networks.map(network => network.id),
    providers: pluck(links, "provider").map(({
      networks: providerNetworks,
      environmentVariables: providerVariables,
      ...otherPropsOfProvider
    }) => ({
      ...otherPropsOfProvider,
      networkIds: pluck(providerNetworks, "id"),
      variables: Object.fromEntries(providerVariables.map(entry => [entry.key, entry.value] as const)),
    })),
    clients: pluck(clientLinks, "service"),
  } satisfies z.infer<typeof ServiceDTO>;
}
