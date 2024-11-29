import { afterAll, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { NetworkDTO, testNetworkData } from "~/models/network";
import createNetwork from "./createNetwork";
import deleteNetwork from "./deleteNetwork";

describe("createNetwork", () => {
  const schema = NetworkDTO.pick({ id: true });
  const data = testNetworkData();

  it("should successfully create a network", async () => {
    await db.transaction(async tx => {
      const network = await createNetwork(tx, data);
      const { success } = schema.safeParse(network);
      expect(success).toBe(true);
      await deleteNetwork(tx, network.id);
    });
  });
});

afterAll(done => {
  evacuatePool().then(() => done());
});
