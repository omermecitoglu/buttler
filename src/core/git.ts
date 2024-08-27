import fs from "node:fs/promises";
import path from "node:path";
import simpleGit from "simple-git";
import env from "./env";

export async function cloneRepo(repoUrl: string, targetPath: string) {
  const git = simpleGit({
    baseDir: targetPath,
    binary: "git",
    maxConcurrentProcesses: 6,
  });
  await git.clone(repoUrl, targetPath, {
    "--depth": "1",
    "--single-branch": null,
    "--branch": "main",
  });
}

export async function deleteRepo(serviceId: string) {
  const repoPath = path.resolve(env.CURRENT_WORKING_DIRECTORY, "storage/repos", serviceId);
  await fs.rm(repoPath, { recursive: true, force: true });
}
