"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";
import { disconnectCloudflare } from "~/core/cloudflare/connection";
import { createAuthorization } from "~/core/cloudflare/oauth";
import { getAccounts, removeTunnel, setUpTunnel } from "~/core/cloudflare/tunnel";
import { getZones } from "~/core/cloudflare/zones";
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

export const setUpTunnelAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({
    accountId: z.string(),
  }),
  action: ({ accountId }) => async (): Promise<Record<string, string>> => {
    try {
      const accounts = getAccounts(await getZones());
      if (!accounts.some(({ id }) => id === accountId)) throw new Error("The account was not chosen while connecting");
      await setUpTunnel(accountId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to set up the Cloudflare tunnel:", error);
      return displayMessage("error", "setup_failed");
    }
    updateTag("getAllServices()");
    refresh();
    return {};
  },
});

export const disconnectCloudflareAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({}),
  action: () => async (): Promise<Record<string, string>> => {
    try {
      // The tunnel can't be deleted without the connection
      await removeTunnel();
      await disconnectCloudflare();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to disconnect Cloudflare:", error);
      return displayMessage("error", "disconnect_failed");
    }
    updateTag("getAllServices()");
    updateTag("getSingleService(...)");
    refresh();
    return {};
  },
});
