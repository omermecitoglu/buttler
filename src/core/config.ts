import "server-only";
import { z } from "zod/v4";
import { omit } from "~/utils/object";
import { generateNginxConfig } from "./nginx-conf";
import { readFileContent, removeFile, saveFile } from "./storage";

export const configSchema = z.object({
  appHostName: z.url(),
  sslCertificate: z.string().trim().startsWith("-----BEGIN CERTIFICATE-----").endsWith("-----END CERTIFICATE-----"),
  sslCertificateKey: z.string().trim().startsWith("-----BEGIN PRIVATE KEY-----").endsWith("-----END PRIVATE KEY-----"),
  sslClientCertificate: z.string().trim().startsWith("-----BEGIN CERTIFICATE-----").endsWith("-----END CERTIFICATE-----"),
}).partial();

type Configs = z.infer<typeof configSchema>;

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
  const data = configSchema.parse(omit(input, "sslCertificate", "sslCertificateKey", "sslClientCertificate"));
  await saveFile(".", "config.json", JSON.stringify(data, null, 2) + "\n");
}

export async function onConfigUpdate<K extends keyof Configs>(key: K, oldValue: Configs[K], newValue: Configs[K]) {
  switch (key) {
    case "sslCertificate":
      if (newValue) {
        await saveFile("system/ssl", "ssl-certificate.pem", newValue);
      } else {
        await removeFile("system/ssl", "ssl-certificate.pem");
      }
      return {
        reloadNginx: oldValue !== newValue,
        coldRestart: false,
      };
    case "sslCertificateKey":
      if (newValue) {
        await saveFile("system/ssl", "ssl-certificate-key.pem", newValue);
      } else {
        await removeFile("system/ssl", "ssl-certificate-key.pem");
      }
      return {
        reloadNginx: oldValue !== newValue,
        coldRestart: false,
      };
    case "sslClientCertificate":
      if (newValue) {
        await saveFile("system/ssl", "ssl-client-certificate.crt", newValue);
      } else {
        await removeFile("system/ssl", "ssl-client-certificate.crt");
      }
      return {
        reloadNginx: oldValue !== newValue,
        coldRestart: false,
      };
    case "appHostName":
      await saveFile("system", "nginx.conf", await generateNginxConfig(newValue));
      return {
        reloadNginx: oldValue !== newValue,
        coldRestart: false,
      };
    default:
      return {
        reloadNginx: false,
        coldRestart: false,
      };
  }
}
