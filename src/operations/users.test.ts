import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import claimAdmin from "./claimAdmin";
import createUser from "./createUser";
import deleteUser from "./deleteUser";
import getUser from "./getUser";
import getUsers from "./getUsers";
import hasAdmin from "./hasAdmin";
import updateUser from "./updateUser";

const admin = { id: 9, login: "admin", avatar: "https://avatars.githubusercontent.com/u/9" };
const member = { id: 2, login: "member", avatar: "https://avatars.githubusercontent.com/u/2" };

describe("whitelist operations", () => {
  const client = new DatabaseSync(":memory:");
  const db = drizzle({ client, relations });
  migrate(db, { migrationsFolder: "drizzle" });

  beforeEach(async () => {
    client.exec("DELETE FROM users");
    await claimAdmin(db, admin);
  });

  it("should know whether there is an admin", async () => {
    expect(await hasAdmin(db)).toBe(true);
    client.exec("DELETE FROM users");
    await createUser(db, member);
    expect(await hasAdmin(db)).toBe(false);
  });

  it("should add users and list them after the admin", async () => {
    expect(await createUser(db, member)).toBe(true);
    expect(await getUsers(db)).toMatchObject([{ ...admin, role: "admin" }, { ...member, role: "member" }]);
  });

  it("should not add the same account again", async () => {
    await createUser(db, member);
    expect(await createUser(db, { ...member, login: "renamed" })).toBe(false);
    expect(await createUser(db, admin)).toBe(false);
    expect(await getUser(db, 9)).toMatchObject({ role: "admin" });
  });

  it("should accept a handle that is taken by another account", async () => {
    await createUser(db, member);
    expect(await createUser(db, { ...member, id: 3 })).toBe(true);
  });

  it("should remove users, except the admin", async () => {
    await createUser(db, member);
    expect(await deleteUser(db, 2)).toBe(true);
    expect(await deleteUser(db, 2)).toBe(false);
    expect(await deleteUser(db, 9)).toBe(false);
    expect(await getUsers(db)).toMatchObject([admin]);
  });

  it("should follow the changes of the account without changing its role", async () => {
    await updateUser(db, { ...admin, login: "renamed" });
    expect(await getUser(db, 9)).toMatchObject({ login: "renamed", role: "admin" });
  });

  it("should not give access to unknown users while following changes", async () => {
    await updateUser(db, member);
    expect(await getUser(db, 2)).toBeNull();
  });
});
