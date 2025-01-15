import fs from "node:fs/promises";
import path from "node:path";
import simpleGit, { type SimpleGit } from "simple-git";
import env from "./env";

function getRepoPath(serviceId: string) {
  return path.resolve(env.CURRENT_WORKING_DIRECTORY, "storage/repos", serviceId);
}

export async function cloneRepo(repoUrl: string, serviceId: string) {
  await deleteRepo(serviceId);
  const repoPath = getRepoPath(serviceId);
  await fs.mkdir(repoPath, { recursive: true });
  const git = simpleGit({
    baseDir: repoPath,
    binary: "git",
    maxConcurrentProcesses: 6,
  });
  const numberOfCommits = await getNumberOfCommit(git);
  await git.clone(repoUrl, repoPath, {
    "--depth": (numberOfCommits + 1).toString(),
    "--single-branch": null,
    "--branch": "main",
  });
  return repoPath;
}

export async function deleteRepo(serviceId: string) {
  await fs.rm(getRepoPath(serviceId), { recursive: true, force: true });
}

async function getNumberOfCommit(git: SimpleGit) {
  try {
    const tags = await git.tags();
    const latestTag = tags.latest;
    const numberOfCommits = await git.raw(["rev-list", "--count", `${latestTag}..HEAD`]);
    const output = parseInt(numberOfCommits);
    if (isNaN(output)) throw new Error("NaN");
    return output;
  } catch {
    return 0;
  }
}
