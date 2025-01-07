import type database from "~/database";
import type { ServiceDTO } from "~/models/service";
import { pluck } from "~/utils/object";

export default async function getServiceByRepo(db: typeof database, repo: string) {
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
      providerlinks: {
        columns: {},
        with: {
          provider: {
            columns: {
              id: true,
              name: true,
              repo: true,
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
          client: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    where: (table, { eq }) => eq(table.repo, repo),
  });
  if (!service) return null;
  const { ports, environmentVariables, volumes, networks, providerlinks, clientLinks, ...others } = service;
  return {
    ...others,
    environmentVariables: Object.fromEntries(environmentVariables.map(({ key, value }) => [key, value] as const)),
    ports: Object.fromEntries(ports.map(({ external, internal }) => [external, internal.toString()] as const)),
    volumes: Object.fromEntries(volumes.map(({ id, containerPath }) => [id, containerPath] as const)),
    networkIds: networks.map(network => network.id),
    providers: pluck(providerlinks, "provider").map(({
      networks: providerNetworks,
      environmentVariables: providerVariables,
      ...otherPropsOfProvider
    }) => ({
      ...otherPropsOfProvider,
      networkIds: pluck(providerNetworks, "id"),
      variables: Object.fromEntries(providerVariables.map(entry => [entry.key, entry.value] as const)),
    })),
    clients: pluck(clientLinks, "client"),
  } satisfies ServiceDTO;
}
