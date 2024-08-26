import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { EnvironmentVariableDTO, testEnvironmentVariableData } from "~/models/environment-variable";
import createEnvironmentVariable from "./createEnvironmentVariable";
import deleteEnvironmentVariable from "./deleteEnvironmentVariable";

let testEnvironmentVariableID = "";

describe("deleteEnvironmentVariable", () => {
  const schema = EnvironmentVariableDTO.pick({ id: true });

  it("should fail when trying to delete a nonexistent environment variable", async () => {
    const pseudoEnvironmentVariableId = crypto.randomUUID();
    const result = await deleteEnvironmentVariable(db, pseudoEnvironmentVariableId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully delete an existing environment variable", async () => {
    await db.transaction(async tx => {
      const result = await deleteEnvironmentVariable(tx, testEnvironmentVariableID);
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
    });
  });
});

beforeEach(async () => {
  const environmentVariable = await createEnvironmentVariable(db, testEnvironmentVariableData());
  testEnvironmentVariableID = environmentVariable.id;
});

afterEach(async () => {
  await deleteEnvironmentVariable(db, testEnvironmentVariableID);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
