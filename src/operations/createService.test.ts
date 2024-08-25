import { afterAll, describe, expect, it } from "@jest/globals";
import db, { evacuatePool } from "~/database";
import { ServiceDTO, testServiceData } from "~/models/service";
import createService from "./createService";
import deleteService from "./deleteService";

describe("createService", () => {
  const schema = ServiceDTO.pick({ id: true });
  const data = testServiceData();

  it("should successfully create a service", async () => {
    await db.transaction(async tx => {
      const service = await createService(tx, data);
      const { success } = schema.safeParse(service);
      expect(success).toBe(true);
      await deleteService(tx, service.id);
    });
  });
});

afterAll(done => {
  evacuatePool().then(() => done());
});
