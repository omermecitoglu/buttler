import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { BuildImageDTO, testBuildImageData } from "~/models/build-image";
import createBuildImage from "./createBuildImage";
import deleteBuildImage from "./deleteBuildImage";
import getBuildImage from "./getBuildImage";

let testBuildImageID = "";

describe("getBuildImage", () => {
  const schema = BuildImageDTO;

  it("should fail when trying to find a nonexistent build image", async () => {
    const pseudoBuildImageId = crypto.randomUUID();
    const result = await getBuildImage(db, pseudoBuildImageId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully retrieve an existing build image", async () => {
    const result = await getBuildImage(db, testBuildImageID);
    const { success } = schema.safeParse(result);
    expect(success).toBe(true);
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
