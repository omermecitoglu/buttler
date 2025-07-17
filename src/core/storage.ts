import fs, { constants } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const buttlerDirectory = path.resolve(homedir(), ".buttler");

export function getFilePath(dir: string, fileName: string) {
  return path.resolve(buttlerDirectory, dir, fileName);
}

export async function checkFile(dir: string, fileName: string) {
  try {
    await fs.access(getFilePath(dir, fileName), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readFileContent(dir: string, fileName: string) {
  try {
    return await fs.readFile(getFilePath(dir, fileName), "utf8");
  } catch {
    return null;
  }
}

export async function saveFile(dir: string, fileName: string, content: string) {
  const dirPath = path.resolve(buttlerDirectory, dir);
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = path.resolve(dirPath, fileName);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

export async function removeFile(dir: string, fileName: string) {
  await fs.unlink(getFilePath(dir, fileName));
}
