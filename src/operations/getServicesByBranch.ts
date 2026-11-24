import { parseRepository } from "~/core/git";
import type database from "~/database";

function getFullName(repository: string | null) {
  if (!repository) return null;
  try {
    const { owner, name } = parseRepository(repository);
    return `${owner}/${name}`.toLowerCase();
  } catch {
    return null;
  }
}

/** Returns the GitHub services that are deployed from the given branch of a repository */
export default async function getServicesByBranch(db: typeof database, repository: string, branch: string) {
  const fullName = getFullName(repository);
  if (!fullName) return [];
  const services = await db.query.services.findMany({
    where: { type: "github", branch },
  });
  return services.filter(service => getFullName(service.repository) === fullName);
}
