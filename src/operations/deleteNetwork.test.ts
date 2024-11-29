import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { NetworkDTO, testNetworkData } from "~/models/network";
import createNetwork from "./createNetwork";
import deleteNetwork from "./deleteNetwork";

let testNetworkID = "";

describe("deleteNetwork", () => {
  const schema = NetworkDTO.pick({ id: true });

  it("should fail when trying to delete a nonexistent network", async () => {
    const pseudoNetworkId = crypto.randomUUID();
    const result = await deleteNetwork(db, pseudoNetworkId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully delete an existing network", async () => {
    await db.transaction(async tx => {
      const result = await deleteNetwork(tx, testNetworkID);
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
    });
  });
});

beforeEach(async () => {
  const network = await createNetwork(db, testNetworkData());
  testNetworkID = network.id;
});

afterEach(async () => {
  await deleteNetwork(db, testNetworkID);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
