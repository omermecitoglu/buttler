"use server";
import { requireUser } from "~/core/auth";
import { parseRepository } from "~/core/git";
import { getInstallationTokenForOwner } from "~/core/github/app";
import { type CommitRange, compareCommits, getCommit } from "~/core/github/commits";
import db from "~/database";
import getService from "~/operations/getService";

const commitHashPattern = /^[0-9a-f]{7,40}$/;

/**
 * Lists the commits that a build added on top of the previous one.
 * Without a previous build, only the commit of the build itself is listed.
 * Returns null when GitHub can't tell.
 */
export async function getBuildCommits(
  serviceId: string,
  commit: string,
  previousCommit: string | null,
): Promise<CommitRange | null> {
  await requireUser();
  if (!commitHashPattern.test(commit) || (previousCommit !== null && !commitHashPattern.test(previousCommit))) {
    return null;
  }
  const service = await getService(db, serviceId);
  if (!service || service.type !== "github" || !service.repository) return null;
  try {
    const { owner, name } = parseRepository(service.repository);
    const token = await getInstallationTokenForOwner(owner);
    if (!previousCommit) {
      return { commits: [await getCommit(token, owner, name, commit)], total: 1 };
    }
    return await compareCommits(token, owner, name, previousCommit, commit);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to get the commits of the build:", error);
    return null;
  }
}
