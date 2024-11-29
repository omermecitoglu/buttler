import { afterAll, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { VolumeDTO, testVolumeData } from "~/models/volume";
import createVolume from "./createVolume";
import deleteVolume from "./deleteVolume";

describe("createVolume", () => {
  const schema = VolumeDTO.pick({ id: true });
  const data = testVolumeData();

  it("should successfully create a volume", async () => {
    await db.transaction(async tx => {
      const volume = await createVolume(tx, data);
      const { success } = schema.safeParse(volume);
      expect(success).toBe(true);
      await deleteVolume(tx, volume.id);
    });
  });
});

afterAll(done => {
  evacuatePool().then(() => done());
});
