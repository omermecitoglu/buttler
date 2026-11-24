import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import claimAdmin from "./claimAdmin";
import getUser from "./getUser";

const first = { id: 1, login: "first", avatar: "https://avatars.githubusercontent.com/u/1" };
const second = { id: 2, login: "second", avatar: "https://avatars.githubusercontent.com/u/2" };

describe("claimAdmin", () => {
  const client = new DatabaseSync(":memory:");
  const db = drizzle({ client, relations });
  migrate(db, { migrationsFolder: "drizzle" });

  beforeEach(() => {
    client.exec("DELETE FROM users");
  });

  it("should make the first user the admin", async () => {
    await claimAdmin(db, first);
    expect(await getUser(db, 1)).toMatchObject({ ...first, role: "admin" });
  });

  it("should keep the admin on later logins", async () => {
    await claimAdmin(db, first);
    await claimAdmin(db, first);
    expect(await db.query.users.findMany()).toHaveLength(1);
  });

  it("should ignore everyone else", async () => {
    await claimAdmin(db, first);
    await claimAdmin(db, second);
    expect(await getUser(db, 2)).toBeNull();
  });

  it("should create a single admin when two users log in at the same time", async () => {
    await Promise.all([claimAdmin(db, first), claimAdmin(db, second)]);
    expect(await db.query.users.findMany()).toHaveLength(1);
  });

  it("should not allow a second admin in the database", async () => {
    await claimAdmin(db, first);
    expect(() => client.exec("INSERT INTO users (id, login, avatar, role) VALUES (2, 'second', '', 'admin')"))
      .toThrow("UNIQUE constraint failed");
  });
});
