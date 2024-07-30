#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

const program = new Command();

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
  const appPath = resolve(__dirname, "index.js");
  const child = spawn("node", [appPath], {
    detached,
    stdio: detached ? "ignore" : "inherit",
    env: {
      PORT: "2083",
    },
  });
  if (detached) child.unref();
  return child.pid;
}

program.command("start").description("starts the application").action(async () => {
  const pidFilePath = resolve(process.cwd(), "PID");
  const exists = await checkFile(pidFilePath);
  if (exists) {
    return console.warn("the application is already running");
  }
  const pid = spawnChildProcess(true);
  await fs.writeFile(pidFilePath, `${pid}`, "utf8");
  console.log("the application has started");
});

program.command("stop").description("stops the application").action(async () => {
  const pidFilePath = resolve(process.cwd(), "PID");
  const exists = await checkFile(pidFilePath);
  if (!exists) {
    return console.warn("the application was not running");
  }
  const content = await fs.readFile(pidFilePath, "utf-8");
  const pid = parseInt(content);
  if (isNaN(pid)) {
    return console.error("Invalid PID");
  }
  try {
    process.kill(pid);
    console.log("the application is stopped");
  } catch {
    console.warn("the application was crashed");
  } finally {
    await fs.unlink(pidFilePath);
  }
});

program.parse(process.argv);
