import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { EnvironmentVariableDTO, testEnvironmentVariableData } from "~/models/environment-variable";
import createEnvironmentVariable from "./createEnvironmentVariable";
import deleteEnvironmentVariable from "./deleteEnvironmentVariable";
import getEnvironmentVariable from "./getEnvironmentVariable";

let testEnvironmentVariableID = "";

describe("getEnvironmentVariable", () => {
  const schema = EnvironmentVariableDTO;

  it("should fail when trying to find a nonexistent environment variable", async () => {
    const pseudoEnvironmentVariableId = crypto.randomUUID();
    const result = await getEnvironmentVariable(db, pseudoEnvironmentVariableId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully retrieve an existing environment variable", async () => {
    const result = await getEnvironmentVariable(db, testEnvironmentVariableID);
    const { success } = schema.safeParse(result);
    expect(success).toBe(true);
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
