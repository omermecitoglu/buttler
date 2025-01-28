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
  const latestTaggedCommitHash = await getLatestTaggedCommitHash(git, repoUrl);
  await git.clone(repoUrl, repoPath, {
    "--depth": "1",
    "--single-branch": null,
    "--branch": "main",
  });
  if (latestTaggedCommitHash) {
    await git.cwd(repoPath);
    await git.fetch("origin", latestTaggedCommitHash);
  }
  return repoPath;
}

export async function deleteRepo(serviceId: string) {
  await fs.rm(getRepoPath(serviceId), { recursive: true, force: true });
}

async function getLatestTaggedCommitHash(git: SimpleGit, repoUrl: string) {
  const output = await git.listRemote(["--tags", repoUrl]);
  const entries = output.split("\n").slice(0, -1).map(entry => entry.split("\t"));
  const lastEntry = entries.at(-1);
  if (lastEntry && lastEntry.length === 2) {
    return lastEntry[0];
  }
}
