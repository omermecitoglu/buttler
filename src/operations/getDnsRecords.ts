import type database from "~/database";

export default function getDnsRecords(db: typeof database) {
  return db.query.dnsRecords.findMany({
    orderBy: { hostname: "asc" },
  });
}
