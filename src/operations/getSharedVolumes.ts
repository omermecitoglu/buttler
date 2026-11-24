import type database from "~/database";

/** Returns the names of the volumes of a service that other services use too, even if they are stopped */
export default async function getSharedVolumes(db: typeof database, serviceId: string) {
  const volumes = await db.query.volumes.findMany({
    columns: { serviceId: true, name: true },
  });
  const ownNames = new Set(volumes.filter(volume => volume.serviceId === serviceId).map(volume => volume.name));
  const otherNames = new Set(volumes.filter(volume => volume.serviceId !== serviceId).map(volume => volume.name));
  return [...ownNames].filter(name => otherNames.has(name));
}
