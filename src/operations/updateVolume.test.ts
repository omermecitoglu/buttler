import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { VolumeDTO, testVolumeData } from "~/models/volume";
import createVolume from "./createVolume";
import deleteVolume from "./deleteVolume";
import updateVolume from "./updateVolume";

let testVolumeID = "";

describe("updateVolume", () => {
  const schema = VolumeDTO;

  it("should fail when trying to update a nonexistent volume", async () => {
    const pseudoVolumeId = crypto.randomUUID();
    const result = await updateVolume(db, pseudoVolumeId, testVolumeData());
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully update an existing volume", async () => {
    await db.transaction(async tx => {
      const result = await updateVolume(tx, testVolumeID, { name: "testing" });
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
      expect(result?.name).toBe("testing");
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
