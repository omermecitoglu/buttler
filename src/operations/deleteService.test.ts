import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { ServiceDTO, testServiceData } from "~/models/service";
import createService from "./createService";
import deleteService from "./deleteService";

let testServiceID = "";

describe("deleteService", () => {
  const schema = ServiceDTO.pick({ id: true });

  it("should fail when trying to delete a nonexistent service", async () => {
    const pseudoServiceId = crypto.randomUUID();
    const result = await deleteService(db, pseudoServiceId);
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully delete an existing service", async () => {
    await db.transaction(async tx => {
      const result = await deleteService(tx, testServiceID);
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
    });
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
