"use server";
import { defineFormAction } from "@omer-x/bs-ui-kit/server-action";
import { redirect } from "next/navigation";
import { configSchema, getConfigs, saveConfigs } from "~/core/config";
import { reloadReverseProxyService } from "~/core/nginx";
import { saveFile } from "~/core/storage";

export const { updateConfigs } = defineFormAction({
  name: "updateConfigs",
  middlewares: [],
  schema: configSchema,
  action: input => (async () => {
    const { sslCertificate, sslCertificateKey, sslClientCertificate, ...others } = input;
    const old = await getConfigs();
    let needsToReload = false;
    if (sslCertificate && sslCertificate !== old.sslCertificate) {
      await saveFile("system/ssl", "ssl-certificate.pem", sslCertificate);
      needsToReload = true;
    }
    if (sslCertificateKey && sslCertificateKey !== old.sslCertificateKey) {
      await saveFile("system/ssl", "ssl-certificate-key.pem", sslCertificateKey);
      needsToReload = true;
    }
    if (sslClientCertificate && sslClientCertificate !== old.sslClientCertificate) {
      await saveFile("system/ssl", "ssl-client-certificate.crt", sslClientCertificate);
      needsToReload = true;
    }
    const appHostNameChanged = others.appHostName !== old.appHostName;
    if (appHostNameChanged) {
      needsToReload = true;
    }
    if (needsToReload) {
      await reloadReverseProxyService(false);
    }
    await saveConfigs(others);
    return redirect("/settings");
  }),
});
