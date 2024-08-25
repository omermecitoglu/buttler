#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

async function checkFile(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function spawnChildProcess(detached: boolean) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const appPath = resolve(__dirname, "../ui/server.js");
  const child = spawn("node", [appPath], {
    detached,
    stdio: detached ? "ignore" : "inherit",
    env: {
      ...process.env,
      PORT: "2083",
      WEBHOOK_SECRET: "buttler",
    },
  });
  if (detached) child.unref();
  return child.pid;
}

async function start(development: boolean) {
  if (development) {
    await stop();
  }
  const pidFilePath = resolve(process.cwd(), "PID");
  const exists = await checkFile(pidFilePath);
  if (exists) {
    return console.warn("the application is already running");
  }
  const pid = spawnChildProcess(!development);
  await fs.writeFile(pidFilePath, `${pid}`, "utf8");
  console.log("the application has started");
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
