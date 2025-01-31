import fs from "node:fs/promises";
import path from "node:path";
import simpleGit from "simple-git";
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
  await git.clone(repoUrl, repoPath, {
    "--depth": "1",
    "--single-branch": null,
    "--branch": "main",
  });
  await git.cwd(repoPath);
  await git.fetch(["--tags"]);
  return repoPath;
}

export async function deleteRepo(serviceId: string) {
  await fs.rm(getRepoPath(serviceId), { recursive: true, force: true });
}
