import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { ServiceDTO, testServiceData } from "~/models/service";
import createService from "./createService";
import deleteService from "./deleteService";
import getService from "./getService";

let testServiceID = "";

describe("getService", () => {
  const schema = ServiceDTO;

  it("should fail when trying to find a nonexistent service", async () => {
    const pseudoServiceId = crypto.randomUUID();
    const result = await getService(db, pseudoServiceId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully retrieve an existing service", async () => {
    const result = await getService(db, testServiceID);
    const { success } = schema.safeParse(result);
    expect(success).toBe(true);
  });
});

beforeEach(async () => {
  const service = await createService(db, testServiceData());
  testServiceID = service.id;
});

afterEach(async () => {
  await deleteService(db, testServiceID);
});

afterAll(done => {
  evacuatePool().then(() => done());
});
