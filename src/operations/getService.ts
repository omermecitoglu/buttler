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
          },
        },
      },
    },
    where: (table, { eq }) => eq(table.id, serviceId),
  });
  if (!service) return null;
  const { ports, environmentVariables, volumes, networks, links, ...others } = service;
  return {
    ...others,
    environmentVariables: Object.fromEntries(environmentVariables.map(({ key, value }) => [key, value] as const)),
    ports: Object.fromEntries(ports.map(({ external, internal }) => [external, internal.toString()] as const)),
    volumes: Object.fromEntries(volumes.map(({ id, containerPath }) => [id, containerPath] as const)),
    networks: networks.map(network => network.id),
    providers: pluck(links, "provider"),
  } satisfies z.infer<typeof ServiceDTO>;
}
