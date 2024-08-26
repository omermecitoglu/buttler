import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { EnvironmentVariableDTO, testEnvironmentVariableData } from "~/models/environment-variable";
import createEnvironmentVariable from "./createEnvironmentVariable";
import deleteEnvironmentVariable from "./deleteEnvironmentVariable";
import updateEnvironmentVariable from "./updateEnvironmentVariable";

let testEnvironmentVariableID = "";

describe("updateEnvironmentVariable", () => {
  const schema = EnvironmentVariableDTO;

  it("should fail when trying to update a nonexistent environment variable", async () => {
    const pseudoEnvironmentVariableId = crypto.randomUUID();
    const result = await updateEnvironmentVariable(db, pseudoEnvironmentVariableId, testEnvironmentVariableData());
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully update an existing environment variable", async () => {
    await db.transaction(async tx => {
      const result = await updateEnvironmentVariable(tx, testEnvironmentVariableID, { name: "testing" });
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
      expect(result?.name).toBe("testing");
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
