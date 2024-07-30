import fs from "node:fs/promises";
import path from "node:path";

export async function saveNode(collectionName: string, id: string, data: unknown) {
  const dirPath = path.resolve(process.cwd(), "storage/db", collectionName);
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = path.resolve(dirPath, `${id}.json`);
  return fs.writeFile(filePath, JSON.stringify(data), "utf8");
}

export async function readNode<T>(collectionName: string, id: string) {
  const dirPath = path.resolve(process.cwd(), "storage/db", collectionName);
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = path.resolve(dirPath, `${id}.json`);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export async function findNodes<T>(collectionName: string) {
  const dirPath = path.resolve(process.cwd(), "storage/db", collectionName);
  await fs.mkdir(dirPath, { recursive: true });
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  const files = items.filter(i => i.isFile() && i.name.endsWith(".json"));
  const records = await Promise.all(files.map(f => readNode<T>(collectionName, f.name.slice(0, -5))));
  return Object.fromEntries(files.map((file, index) => [file.name.slice(0, -5), records[index]]));
}
