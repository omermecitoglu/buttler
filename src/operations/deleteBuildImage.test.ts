import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { BuildImageDTO, testBuildImageData } from "~/models/build-image";
import createBuildImage from "./createBuildImage";
import deleteBuildImage from "./deleteBuildImage";

let testBuildImageID = "";

describe("deleteBuildImage", () => {
  const schema = BuildImageDTO.pick({ id: true });

  it("should fail when trying to delete a nonexistent build image", async () => {
    const pseudoBuildImageId = crypto.randomUUID();
    const result = await deleteBuildImage(db, pseudoBuildImageId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully delete an existing build image", async () => {
    await db.transaction(async tx => {
      const result = await deleteBuildImage(tx, testBuildImageID);
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
    });
  });
});

beforeEach(async () => {
  const buildImage = await createBuildImage(db, testBuildImageData());
  testBuildImageID = buildImage.id;
});

afterEach(async () => {
  await deleteBuildImage(db, testBuildImageID);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
