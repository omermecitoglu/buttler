import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { VolumeDTO, testVolumeData } from "~/models/volume";
import createVolume from "./createVolume";
import deleteVolume from "./deleteVolume";
import getVolume from "./getVolume";

let testVolumeID = "";

describe("getVolume", () => {
  const schema = VolumeDTO;

  it("should fail when trying to find a nonexistent volume", async () => {
    const pseudoVolumeId = crypto.randomUUID();
    const result = await getVolume(db, pseudoVolumeId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully retrieve an existing volume", async () => {
    const result = await getVolume(db, testVolumeID);
    const { success } = schema.safeParse(result);
    expect(success).toBe(true);
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
