import type database from "~/database";

/** Returns the people with access, the admin comes first */
export default async function getUsers(db: typeof database) {
  return await db.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.role), asc(u.createdAt), asc(u.id)],
  });
}
