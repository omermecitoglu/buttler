import "server-only";
import { z } from "zod/v4";
import { readFileContent, saveFile } from "./storage";

export const configSchema = z.object({
  appHostName: z.url().optional(),
  sslCertificate: z.string().trim()
    .startsWith("-----BEGIN CERTIFICATE-----")
    .endsWith("-----END CERTIFICATE-----")
    .optional(),
  sslCertificateKey: z.string().trim()
    .startsWith("-----BEGIN PRIVATE KEY-----")
    .endsWith("-----END PRIVATE KEY-----")
    .optional(),
  sslClientCertificate: z.string().trim()
    .startsWith("-----BEGIN CERTIFICATE-----")
    .endsWith("-----END CERTIFICATE-----")
    .optional(),
});

export async function getConfigs() {
  const content = await readFileContent(".", "config.json");
  const data = configSchema.parse(content ? JSON.parse(content) : {});
  const sslCertificate = await readFileContent("system/ssl", "ssl-certificate.pem");
  if (sslCertificate) {
    data.sslCertificate = sslCertificate;
  }
  const sslCertificateKey = await readFileContent("system/ssl", "ssl-certificate-key.pem");
  if (sslCertificateKey) {
    data.sslCertificateKey = sslCertificateKey;
  }
  const sslClientCertificate = await readFileContent("system/ssl", "ssl-client-certificate.crt");
  if (sslClientCertificate) {
    data.sslClientCertificate = sslClientCertificate;
  }
  return data;
}

export async function saveConfigs(input: z.infer<typeof configSchema>) {
  const data = configSchema.parse(input);
  await saveFile(".", "config.json", JSON.stringify(data, null, 2) + "\n");
}
