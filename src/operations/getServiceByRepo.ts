import type database from "~/database";
import type { ServiceDTO } from "~/models/service";
import { pluck } from "~/utils/object";
import createRecord from "~/utils/record";

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
              containerId: true,
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
    where: (table, { eq, like, or }) => or(
      eq(table.repo, `https://github.com/${repo}.git`),
      eq(table.repo, `git@github.com:${repo}.git`),
      like(table.repo, `https://%:%@github.com/${repo}.git`),
    ),
  });
  if (!service) return null;
  const { ports, environmentVariables, volumes, networks, providerlinks, clientLinks, ...others } = service;
  return {
    ...others,
    environmentVariables: createRecord(environmentVariables, "key", "value"),
    ports: Object.fromEntries(ports.map(({ external, internal }) => [external, internal.toString()] as const)),
    volumes: createRecord(volumes, "id", "containerPath"),
    networkIds: pluck(networks, "id"),
    providers: pluck(providerlinks, "provider").map(({
      networks: providerNetworks,
      environmentVariables: providerVariables,
      ...otherPropsOfProvider
    }) => ({
      ...otherPropsOfProvider,
      networkIds: pluck(providerNetworks, "id"),
      variables: createRecord(providerVariables, "key", "value"),
    })),
    clients: pluck(clientLinks, "client"),
  } satisfies ServiceDTO;
}
