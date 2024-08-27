import type database from "~/database";

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
    },
    where: (table, { eq }) => eq(table.repo, repo),
  });
  if (!service) return null;
  const { ports, environmentVariables, ...others } = service;
  return {
    ...others,
    environmentVariables: Object.fromEntries(environmentVariables.map(({ key, value }) => [key, value])),
    ports: Object.fromEntries(ports.map(({ external, internal }) => [external, internal.toString()])),
  };
}
