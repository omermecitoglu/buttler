import "server-only";
import { Storage } from "megajs";

export async function uploadToMega(username: string, password: string, fileName: string, content: string) {
  const storage = await new Storage({
    email: username,
    password: password,
  }).ready;
  const buffer = Buffer.from(content);
  const file = await storage.upload({
    name: fileName,
    size: buffer.length,
  }, buffer).complete;
  return file;
}
