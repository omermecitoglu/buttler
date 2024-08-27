import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { BuildImageDTO, testBuildImageData } from "~/models/build-image";
import createBuildImage from "./createBuildImage";
import deleteBuildImage from "./deleteBuildImage";
import updateBuildImage from "./updateBuildImage";

let testBuildImageID = "";

describe("updateBuildImage", () => {
  const schema = BuildImageDTO;

  it("should fail when trying to update a nonexistent build image", async () => {
    const pseudoBuildImageId = crypto.randomUUID();
    const result = await updateBuildImage(db, pseudoBuildImageId, testBuildImageData());
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully update an existing build image", async () => {
    await db.transaction(async tx => {
      const result = await updateBuildImage(tx, testBuildImageID, { name: "testing" });
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
      expect(result?.name).toBe("testing");
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
