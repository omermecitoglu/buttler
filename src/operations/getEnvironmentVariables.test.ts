import { afterAll, expect, test } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { EnvironmentVariableDTO } from "~/models/environment-variable";
import getEnvironmentVariables from "./getEnvironmentVariables";

test("getEnvironmentVariables", async () => {
  const result = await getEnvironmentVariables(db, ["id"]);
  const schema = EnvironmentVariableDTO.partial().array();
  const { success } = schema.safeParse(result);
  expect(success).toBe(true);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
