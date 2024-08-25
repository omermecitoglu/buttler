import type database from "~/database";

export default function getService(db: typeof database, serviceId: string) {
  return db.query.services.findFirst({
    where: (table, { eq }) => eq(table.id, serviceId),
  });
}
