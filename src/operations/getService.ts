import type database from "~/database";

export default function getService(db: typeof database, serviceId: string) {
  return db.query.services.findFirst({
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
    },
    where: (table, { eq }) => eq(table.id, serviceId),
  });
}
