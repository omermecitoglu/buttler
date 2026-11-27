import type database from "~/database";

/** Returns the names of the services that mount each volume, even if they are stopped. Docker only knows the containers */
export default async function getVolumeUsers(db: typeof database, exceptServiceId?: string) {
  const volumes = await db.query.volumes.findMany({
    columns: { serviceId: true, name: true },
    with: { service: { columns: { name: true } } },
  });
  const users: Record<string, string[]> = {};
  for (const volume of volumes) {
    if (!volume.service || volume.serviceId === exceptServiceId) continue;
    const names = users[volume.name] ??= [];
    if (!names.includes(volume.service.name)) names.push(volume.service.name);
  }
  return users;
}
