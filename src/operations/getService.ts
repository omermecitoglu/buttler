import type database from "~/database";
import type { ServiceDTO } from "~/models/service";
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
    },
    where: (table, { eq }) => eq(table.id, serviceId),
  });
  if (!service) return null;
  const { ports, environmentVariables, volumes, ...others } = service;
  return {
    ...others,
    environmentVariables: Object.fromEntries(environmentVariables.map(({ key, value }) => [key, value] as const)),
    ports: Object.fromEntries(ports.map(({ external, internal }) => [external, internal.toString()] as const)),
    volumes: Object.fromEntries(volumes.map(({ id, containerPath }) => [id, containerPath] as const)),
  } satisfies z.infer<typeof ServiceDTO>;
}
