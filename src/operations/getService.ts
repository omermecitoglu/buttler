import type database from "~/database";

export default async function getService(db: typeof database, serviceId: string) {
  const service = await db.query.services.findFirst({
    where: { id: serviceId },
  });
  return service ?? null;
}
