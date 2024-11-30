import "server-only";
import { snakeCase } from "change-case";
import { Storage } from "megajs";
import { executeCommandInContainer } from "~/core/docker";
import db from "~/database";
import getService from "~/operations/getService";

export async function backupDatabase(serviceId: string) {
  const globalVariables = await db.query.globalVariables.findMany({});
  const megaUserName = globalVariables.find(v => v.key === "mega-username")?.value;
  const megaPassword = globalVariables.find(v => v.key === "mega-password")?.value;
  if (!megaUserName || !megaPassword) return;
  const service = await getService(db, serviceId);
  if (!service) return;
  if (service.kind !== "database") return;
  if (!service.containerId) return;
  for (const client of service.clients) {
    const tableName = snakeCase(client.name);
    const content = await executeCommandInContainer(service.containerId, ["pg_dump", "-U", "postgres", tableName]);
    const storage = await new Storage({
      email: megaUserName,
      password: megaPassword,
    }).ready;
    const now = new Date();
    const fileName = `${tableName}_${now.toISOString()}.sql`;
    await storage.upload(fileName, content).complete;
  }
}
