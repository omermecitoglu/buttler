import { afterAll, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { BuildImageDTO, testBuildImageData } from "~/models/build-image";
import createBuildImage from "./createBuildImage";
import deleteBuildImage from "./deleteBuildImage";

describe("createBuildImage", () => {
  const schema = BuildImageDTO.pick({ id: true });
  const data = testBuildImageData();

  it("should successfully create a build image", async () => {
    await db.transaction(async tx => {
      const buildImage = await createBuildImage(tx, data);
      const { success } = schema.safeParse(buildImage);
      expect(success).toBe(true);
      await deleteBuildImage(tx, buildImage.id);
    });
  });
});

afterAll(done => {
  evacuatePool().then(() => done());
});
