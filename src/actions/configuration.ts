"use server";
import { defineFormAction } from "@omer-x/bs-ui-kit/server-action";
import { redirect } from "next/navigation";
import { configSchema, saveConfigs } from "~/core/config";

export const { updateConfigs } = defineFormAction({
  name: "updateConfigs",
  middlewares: [],
  schema: configSchema,
  action: input => (async () => {
    await saveConfigs(input);
    return redirect("/settings");
  }),
});
