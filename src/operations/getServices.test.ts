import { afterAll, expect, test } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { ServiceDTO } from "~/models/service";
import getServices from "./getServices";

test("getServices", async () => {
  const result = await getServices(db, ["id"]);
  const schema = ServiceDTO.partial().array();
  const { success } = schema.safeParse(result);
  expect(success).toBe(true);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
