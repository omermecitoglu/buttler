import type database from "~/database";

/** Returns the domains of all services */
export default function getDomains(db: typeof database) {
  return db.query.domains.findMany({
    orderBy: { hostname: "asc" },
  });
}
