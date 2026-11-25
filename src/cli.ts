#!/usr/bin/env node
import { type ChildProcess, spawn } from "node:child_process";
import { closeSync } from "node:fs";
import fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { getLogPath, openLogFile } from "./core/log-file";
import { getSetupLink } from "./core/setup-code";

/* eslint-disable no-console */

const DASHBOARD_URL = "http://localhost:7777";

const POLL_INTERVAL = 1000;

/** Images may be pulled during the first start */
const START_TIMEOUT = 5 * 60_000;

const STOP_TIMEOUT = 10_000;

async function checkFile(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function spawnChildProcess(detached: boolean, debug: boolean) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
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
      CURRENT_WORKING_DIRECTORY: process.cwd(),
      DRIZZLE_DIR: resolve(__dirname, "../drizzle"),
      ...(debug ? { DEBUG_MODE: "yes" } : {}),
    },
  });
  if (detached) child.unref();
  if (logFile !== null) closeSync(logFile);
  return child;
}

async function isResponding() {
  try {
    await fetch(DASHBOARD_URL, { redirect: "manual", signal: AbortSignal.timeout(POLL_INTERVAL) });
    return true;
  } catch {
    return false;
  }
}

async function waitUntilReady(child: ChildProcess): Promise<"ready" | "crashed" | "slow"> {
  const deadline = Date.now() + START_TIMEOUT;
  while (Date.now() < deadline) {
    // Another application may use the port, a child that can't listen needs some time to exit
    await wait(POLL_INTERVAL);
    if (child.exitCode !== null || child.signalCode !== null) return "crashed";
    if (await isResponding()) return "ready";
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
  const pidFilePath = resolve(process.cwd(), "PID");
  const exists = await checkFile(pidFilePath);
  if (exists) {
    console.warn("the application is already running");
    printAddress();
    return;
  }
  const child = spawnChildProcess(!development, development);
  await fs.writeFile(pidFilePath, `${child.pid}`, "utf8");
  console.log("the application is starting");
  const result = await waitUntilReady(child);
  if (result === "crashed") {
    await fs.rm(pidFilePath, { force: true });
    console.error("the application could not start");
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
  const pidFilePath = resolve(process.cwd(), "PID");
  const exists = await checkFile(pidFilePath);
  if (!exists) {
    return console.warn("the application was not running");
  }
  const content = await fs.readFile(pidFilePath, "utf-8");
  const pid = parseInt(content);
  try {
    if (isNaN(pid)) throw new Error("Invalid PID");
    process.kill(pid);
    await waitUntilGone(pid);
    console.log("the application is stopped");
  } catch {
    console.warn("the application was crashed");
  } finally {
    await fs.unlink(pidFilePath);
  }
}

async function restart() {
  await stop();
  await start(false);
}

const program = new Command();
program.command("dev").description("starts the application").action(() => start(true));
program.command("start").description("starts the application").action(() => start(false));
program.command("stop").description("stops the application").action(stop);
program.command("restart").description("restarts the application").action(restart);
program.parse(process.argv);
