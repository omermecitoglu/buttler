"use server";
import { defineFormAction } from "@omer-x/bs-ui-kit/server-action";
import { redirect } from "next/navigation";
import { configSchema, getConfigs, onConfigUpdate, saveConfigs } from "~/core/config";
import { reloadReverseProxyService } from "~/core/nginx";

export const { updateConfigs } = defineFormAction({
  name: "updateConfigs",
  middlewares: [],
  schema: configSchema,
  action: input => (async () => {
    const old = await getConfigs();
    const updateResult = await Promise.all(Object.keys(old).map(configKey => {
      const key = configKey as keyof typeof old;
      return onConfigUpdate(key, old[key], input[key]);
    }));
    const reloadNginx = updateResult.some(entry => entry.reloadNginx);
    const coldRestart = updateResult.some(entry => entry.coldRestart);
    if (reloadNginx) {
      await reloadReverseProxyService(coldRestart);
    }
    await saveConfigs(input);
    return redirect("/settings");
  }),
});
