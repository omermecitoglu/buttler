#!/usr/bin/env node
import { type ChildProcess, execFile, spawn } from "node:child_process";
import { closeSync, readFileSync } from "node:fs";
import fs, { constants } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Command } from "commander";
import { getLogPath, openLogFile } from "./core/log-file";
import { getSetupLink } from "./core/setup-code";
import { checkFile, getFilePath, removeFile, saveFile } from "./core/storage";

/* eslint-disable no-console */

const DASHBOARD_URL = "http://localhost:7777";

const POLL_INTERVAL = 1000;

/** Images may be pulled during the first start */
const START_TIMEOUT = 5 * 60_000;

const STOP_TIMEOUT = 10_000;

const SERVER_ERROR = 500;

const PID_FILE = "PID";

const PACKAGE_NAME = "@omer-x/buttler";

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);

/** Both the bundle in "bin" and the source in "src" are one level below the package root */
function getVersion() {
  const content = readFileSync(resolve(__dirname, "../package.json"), "utf-8");
  const { version } = JSON.parse(content) as { version: string };
  return version;
}

function spawnChildProcess(detached: boolean, debug: boolean) {
  const appPath = resolve(__dirname, "../ui/server.js");
  // The output would be lost, because nobody is watching a detached process
  const logFile = detached ? openLogFile() : null;
  const child = spawn("node", [appPath], {
    detached,
    stdio: logFile === null ? "inherit" : ["ignore", logFile, logFile],
    env: {
      ...process.env,
      PORT: "7777",
      WEBHOOK_SECRET: "buttler",
      DRIZZLE_DIR: resolve(__dirname, "../drizzle"),
      ...(debug ? { DEBUG_MODE: "yes" } : {}),
    },
  });
  if (detached) child.unref();
  if (logFile !== null) closeSync(logFile);
  return child;
}

/** Returns null if there is no response */
async function getStatus() {
  try {
    const { status } = await fetch(DASHBOARD_URL, { redirect: "manual", signal: AbortSignal.timeout(POLL_INTERVAL) });
    return status;
  } catch {
    return null;
  }
}

async function waitUntilReady(child: ChildProcess): Promise<"ready" | "broken" | "crashed" | "slow"> {
  const deadline = Date.now() + START_TIMEOUT;
  while (Date.now() < deadline) {
    // Another application may use the port, a child that can't listen needs some time to exit
    await wait(POLL_INTERVAL);
    if (child.exitCode !== null || child.signalCode !== null) return "crashed";
    const status = await getStatus();
    // The server also listens if it couldn't be prepared, but then it only responds with errors
    if (status !== null) return status < SERVER_ERROR ? "ready" : "broken";
  }
  return "slow";
}

function printAddress() {
  const setupLink = getSetupLink();
  console.log(setupLink === null ? `Buttler is at ${DASHBOARD_URL}` : `Open this link to set up Buttler:\n\n  ${setupLink}\n`);
}

async function start(development: boolean) {
  if (development) {
    await stop();
  }
  const exists = await checkFile("", PID_FILE);
  if (exists) {
    console.warn("the application is already running");
    printAddress();
    return;
  }
  const child = spawnChildProcess(!development, development);
  await saveFile("", PID_FILE, `${child.pid}`);
  console.log("the application is starting");
  const result = await waitUntilReady(child);
  if (result === "crashed") {
    await fs.rm(getFilePath("", PID_FILE), { force: true });
    console.error("the application could not start");
    process.exitCode = 1;
  } else if (result === "broken") {
    console.error("the application is running, but it doesn't work");
    process.exitCode = 1;
  } else if (result === "slow") {
    console.warn("the application is still starting");
  } else {
    console.log("the application has started");
    printAddress();
  }
  if (!development) console.log(`The server log is at ${getLogPath()}`);
}

function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** The port is not free until the process is gone */
async function waitUntilGone(pid: number) {
  const deadline = Date.now() + STOP_TIMEOUT;
  while (isRunning(pid) && Date.now() < deadline) await wait(100);
}

async function stop() {
  const exists = await checkFile("", PID_FILE);
  if (!exists) {
    return console.warn("the application was not running");
  }
  const content = await fs.readFile(getFilePath("", PID_FILE), "utf-8");
  const pid = parseInt(content);
  try {
    if (isNaN(pid)) throw new Error("Invalid PID");
    process.kill(pid);
    await waitUntilGone(pid);
    console.log("the application is stopped");
  } catch {
    console.warn("the application was crashed");
  } finally {
    await removeFile("", PID_FILE);
  }
}

async function restart() {
  await stop();
  await start(false);
}

/** An alpha prerelease (e.g. 1.2.0-alpha.3) stays on the alpha channel */
function getReleaseTag(version: string) {
  return version.includes("-alpha.") ? "alpha" : "latest";
}

/** Returns null if the registry can't be reached */
async function getPublishedVersion(tag: string) {
  try {
    const { stdout } = await promisify(execFile)("npm", ["view", `${PACKAGE_NAME}@${tag}`, "version"]);
    return stdout.trim();
  } catch {
    return null;
  }
}

/** npm writes the new files next to the installed package, a system-wide Node needs sudo for it */
async function canInstall() {
  try {
    await fs.access(resolve(__dirname, "../.."), constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function runChildProcess(command: string, args: string[]) {
  return new Promise<boolean>(done => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", () => done(false));
    child.on("exit", code => done(code === 0));
  });
}

async function update() {
  const installedVersion = getVersion();
  const tag = getReleaseTag(installedVersion);
  const publishedVersion = await getPublishedVersion(tag);
  if (publishedVersion === null) {
    console.error("the published version could not be checked");
    process.exitCode = 1;
    return;
  }
  if (publishedVersion === installedVersion) {
    return console.log(`Buttler is up to date (${installedVersion})`);
  }
  const packageSpec = `${PACKAGE_NAME}@${tag}`;
  if (!(await canInstall())) {
    console.error("Buttler can't be updated without permission, run this command instead:");
    console.error(`\n  sudo npm install -g ${packageSpec}\n`);
    process.exitCode = 1;
    return;
  }
  const wasRunning = await checkFile("", PID_FILE);
  // npm replaces the files that the running server uses
  if (wasRunning) await stop();
  console.log(`updating Buttler from ${installedVersion} to ${publishedVersion}`);
  const installed = await runChildProcess("npm", ["install", "-g", packageSpec]);
  if (!installed) {
    console.error("Buttler could not be updated");
    process.exitCode = 1;
  }
  // This process still has the old code, the new one runs the new migrations at startup
  if (wasRunning) {
    const started = await runChildProcess(process.execPath, [__filename, "start"]);
    if (!started) process.exitCode = 1;
  }
}

const program = new Command();
program.version(getVersion(), "-v, --version", "prints the version");
program.command("version").description("prints the version").action(() => console.log(getVersion()));
program.command("dev").description("starts the application").action(() => start(true));
program.command("start").description("starts the application").action(() => start(false));
program.command("stop").description("stops the application").action(stop);
program.command("restart").description("restarts the application").action(restart);
program.command("update").description("updates the application and restarts it").action(update);
program.parse(process.argv);
