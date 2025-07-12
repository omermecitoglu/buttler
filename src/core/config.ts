import "server-only";
import { z } from "zod/v4";
import { readFileContent, saveFile } from "./storage";

export const configSchema = z.object({
  sslCertificate: z.string().optional(),
  sslCertificateKey: z.string().optional(),
  sslClientCertificate: z.string().optional(),
});

export async function getConfigs() {
  const content = await readFileContent(".", "config.json");
  return configSchema.parse(content ? JSON.parse(content) : {});
}

export async function saveConfigs(input: z.infer<typeof configSchema>) {
  const data = configSchema.parse(input);
  await saveFile(".", "config.json", JSON.stringify(data, null, 2) + "\n");
}
