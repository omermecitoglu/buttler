"use server";
import { defineFormAction } from "@omer-x/bs-ui-kit/server-action";
import { redirect } from "next/navigation";
import { configSchema, saveConfigs } from "~/core/config";
import { saveFile } from "~/core/storage";

export const { updateConfigs } = defineFormAction({
  name: "updateConfigs",
  middlewares: [],
  schema: configSchema,
  action: input => (async () => {
    const { sslCertificate, sslCertificateKey, sslClientCertificate, ...others } = input;
    if (sslCertificate) {
      await saveFile("system/ssl", "ssl-certificate.pem", sslCertificate);
    }
    if (sslCertificateKey) {
      await saveFile("system/ssl", "ssl-certificate-key.pem", sslCertificateKey);
    }
    if (sslClientCertificate) {
      await saveFile("system/ssl", "ssl-client-certificate.crt", sslClientCertificate);
    }
    await saveConfigs(others);
    return redirect("/settings");
  }),
});
