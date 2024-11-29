import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { VolumeDTO, testVolumeData } from "~/models/volume";
import createVolume from "./createVolume";
import deleteVolume from "./deleteVolume";

let testVolumeID = "";

describe("deleteVolume", () => {
  const schema = VolumeDTO.pick({ id: true });

  it("should fail when trying to delete a nonexistent volume", async () => {
    const pseudoVolumeId = crypto.randomUUID();
    const result = await deleteVolume(db, pseudoVolumeId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully delete an existing volume", async () => {
    await db.transaction(async tx => {
      const result = await deleteVolume(tx, testVolumeID);
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
    });
  });
});

beforeEach(async () => {
  const volume = await createVolume(db, testVolumeData());
  testVolumeID = volume.id;
});

afterEach(async () => {
  await deleteVolume(db, testVolumeID);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
