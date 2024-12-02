import "server-only";
import { Storage } from "megajs";

export async function uploadToMega(username: string, password: string, fileName: string, content: string) {
  const storage = await new Storage({
    email: username,
    password: password,
  }).ready;
  const file = await storage.upload(fileName, content).complete;
  return file;
}
