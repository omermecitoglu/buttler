import simpleGit from "simple-git";

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
