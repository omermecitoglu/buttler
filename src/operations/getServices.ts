import type database from "~/database";

export default async function getServices(db: typeof database) {
  return await db.query.services.findMany({
    with: {
      ports: true,
    },
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
}
