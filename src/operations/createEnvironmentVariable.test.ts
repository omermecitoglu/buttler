import { afterAll, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { EnvironmentVariableDTO, testEnvironmentVariableData } from "~/models/environment-variable";
import createEnvironmentVariable from "./createEnvironmentVariable";
import deleteEnvironmentVariable from "./deleteEnvironmentVariable";

describe("createEnvironmentVariable", () => {
  const schema = EnvironmentVariableDTO.pick({ id: true });
  const data = testEnvironmentVariableData();

  it("should successfully create a environment variable", async () => {
    await db.transaction(async tx => {
      const environmentVariable = await createEnvironmentVariable(tx, data);
      const { success } = schema.safeParse(environmentVariable);
      expect(success).toBe(true);
      await deleteEnvironmentVariable(tx, environmentVariable.id);
    });
  });
});

afterAll(done => {
  evacuatePool().then(() => done());
});
