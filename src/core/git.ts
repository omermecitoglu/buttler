import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getFilePath } from "./storage";

const execFileAsync = promisify(execFile);

export type CommitInfo = {
  hash: string,
  shortHash: string,
  author: string,
  timestamp: string,
  message: string,
};

export type ClonedRepo = {
  repoPath: string,
  commit: CommitInfo,
  /** Paths of all tracked files, relative to the repository root */
  files: string[],
};

export type CloneRepoOptions = {
  serviceId: string,
  repository: string,
  branch: string,
  token?: string | null,
};

export function parseRepository(repository: string) {
  const match = (/^(?:https:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/).exec(repository.trim());
  if (!match) {
    throw new Error(`Invalid GitHub repository: ${repository}`);
  }
  const [, owner, name] = match;
  return { owner, name, cloneUrl: `https://github.com/${owner}/${name}.git` };
}

function getRepoPath(serviceId: string) {
  return getFilePath("builds", serviceId);
}

// The token is handed over via the environment, so it is never visible in the
// process list, git error messages, or the cloned repository's .git/config
function getGitEnv(token?: string | null): NodeJS.ProcessEnv {
  const gitEnv: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  if (token) {
    const credentials = Buffer.from(`x-access-token:${token}`).toString("base64");
    gitEnv.GIT_CONFIG_COUNT = "1";
    gitEnv.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraHeader";
    gitEnv.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${credentials}`;
  }
  return gitEnv;
}

async function runGit(args: string[], token?: string | null) {
  const { stdout } = await execFileAsync("git", args, {
    env: getGitEnv(token),
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

async function getHeadCommit(repoPath: string): Promise<CommitInfo> {
  const output = await runGit(["-C", repoPath, "log", "-1", "--format=%H%x00%an%x00%aI%x00%B"]);
  const [hash, author, timestamp, message] = output.split("\0");
  return {
    hash,
    shortHash: hash.slice(0, 7),
    author,
    timestamp,
    message: message.trim(),
  };
}

export async function cloneRepo({ serviceId, repository, branch, token }: CloneRepoOptions): Promise<ClonedRepo> {
  const { cloneUrl } = parseRepository(repository);
  const repoPath = getRepoPath(serviceId);
  await deleteRepo(serviceId);
  await fs.mkdir(path.dirname(repoPath), { recursive: true });
  await runGit(["clone", "--depth", "1", "--single-branch", `--branch=${branch}`, "--", cloneUrl, repoPath], token);
  const commit = await getHeadCommit(repoPath);
  const trackedFiles = await runGit(["-C", repoPath, "ls-files", "-z"]);
  return {
    repoPath,
    commit,
    files: trackedFiles.split("\0").filter(Boolean),
  };
}

export async function deleteRepo(serviceId: string) {
  await fs.rm(getRepoPath(serviceId), { recursive: true, force: true });
}
