import { afterAll, afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { ServiceDTO, testServiceData } from "~/models/service";
import createService from "./createService";
import deleteService from "./deleteService";
import updateService from "./updateService";

let testServiceID = "";

describe("updateService", () => {
  const schema = ServiceDTO;

  it("should fail when trying to update a nonexistent service", async () => {
    const pseudoServiceId = crypto.randomUUID();
    const result = await updateService(db, pseudoServiceId, testServiceData());
    const { success } = schema.safeParse(result);
    expect(success).toBe(false);
  });

  it("should successfully update an existing service", async () => {
    await db.transaction(async tx => {
      const result = await updateService(tx, testServiceID, { name: "testing" });
      const { success } = schema.safeParse(result);
      expect(success).toBe(true);
      expect(result?.name).toBe("testing");
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
