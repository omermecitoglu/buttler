import type database from "~/database";

export default async function getNetwork(db: typeof database, networkId: string) {
  const output = await db.query.networks.findFirst({
    where: (table, { eq }) => eq(table.id, networkId),
  });
  if (!output) throw new Error("not found");
  return output;
}
