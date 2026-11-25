import type database from "~/database";

export default async function hasAdmin(db: typeof database) {
  const admin = await db.query.users.findFirst({
    where: { role: "admin" },
  });
  return admin !== undefined;
}
