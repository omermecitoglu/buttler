import "server-only";
import { snakeCase } from "change-case";
import { executeCommandInContainer } from "~/core/docker";
import db from "~/database";
import getService from "~/operations/getService";
import { uploadToMega } from "./mega";

export async function backupDatabase(serviceId: string) {
  const globalVariables = await db.query.globalVariables.findMany({});
  const megaUserName = globalVariables.find(v => v.key === "mega-username")?.value;
  const megaPassword = globalVariables.find(v => v.key === "mega-password")?.value;
  if (!megaUserName || !megaPassword) throw new Error("Mega username or password is missing!");
  const service = await getService(db, serviceId);
  if (!service) return;
  if (service.kind !== "database") return;
  if (!service.containerId) return;
  for (const client of service.clients) {
    const tableName = snakeCase(client.name);
    const content = await executeCommandInContainer(service.containerId, ["pg_dump", "-U", "postgres", tableName]);
    const isoString = new Date().toISOString();
    const fileName = `${tableName}_${isoString.slice(0, 10)}_${isoString.slice(11, 19)}.sql`;
    await uploadToMega(megaUserName, megaPassword, fileName, content);
  }
}
