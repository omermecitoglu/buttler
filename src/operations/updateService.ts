import { eq } from "drizzle-orm";
import type database from "~/database";
import { services } from "~/database/schema/services";
import type { ServicePatchDTO } from "~/models/service";
import type { z } from "zod";

export default async function updateService(db: typeof database, serviceId: string, patch: z.infer<typeof ServicePatchDTO>) {
  const results = await db.update(services)
    .set({
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(services.id, serviceId))
    .returning();
  return results.shift();
}
