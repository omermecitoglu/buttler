import type database from "~/database";

/** Returns a service without the values of its secrets, which makes it safe to be cached and sent to the browser */
export default async function getService(db: typeof database, serviceId: string) {
  const service = await db.query.services.findFirst({
    where: { id: serviceId },
    with: {
      ports: true,
      environmentVariables: true,
      volumes: true,
    },
  });
  if (!service) return null;
  return {
    ...service,
    environmentVariables: service.environmentVariables.map(variable => ({
      ...variable,
      value: variable.isSecret ? null : variable.value,
    })),
  };
}
