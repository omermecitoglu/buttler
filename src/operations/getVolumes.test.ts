import { afterAll, expect, test } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { VolumeDTO } from "~/models/volume";
import getVolumes from "./getVolumes";

test("getVolumes", async () => {
  const result = await getVolumes(db, ["id"]);
  const schema = VolumeDTO.partial().array();
  const { success } = schema.safeParse(result);
  expect(success).toBe(true);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
