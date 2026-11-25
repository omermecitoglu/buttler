"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";
import { disconnectCloudflare } from "~/core/cloudflare/connection";
import { createAuthorization } from "~/core/cloudflare/oauth";
import { getSession } from "~/core/session";
import { adminMiddleware } from "./middlewares/admin";

const AUTHORIZATION_LIFETIME = 10 * 60 * 1000;

export const connectCloudflareAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({}),
  action: () => async (): Promise<Record<string, string>> => {
    const { url, state, verifier } = createAuthorization();
    const session = await getSession();
    session.cloudflare = { state, verifier, expiresAt: Date.now() + AUTHORIZATION_LIFETIME };
    await session.save();
    redirect(url);
  },
});

export const disconnectCloudflareAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({}),
  action: () => async (): Promise<Record<string, string>> => {
    try {
      await disconnectCloudflare();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to disconnect Cloudflare:", error);
      return displayMessage("error", "disconnect_failed");
    }
    refresh();
    return {};
  },
});
