import { afterAll, expect, test } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { BuildImageDTO } from "~/models/build-image";
import getBuildImages from "./getBuildImages";

test("getBuildImages", async () => {
  const result = await getBuildImages(db, ["id"]);
  const schema = BuildImageDTO.partial().array();
  const { success } = schema.safeParse(result);
  expect(success).toBe(true);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
