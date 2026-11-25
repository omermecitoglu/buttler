"use server";
import { defineFormAction } from "@omer-x/next-form-actions";
import { refresh } from "next/cache";
import z from "zod";
import { syncDomains } from "~/core/cloudflare/domains";
import { provisionTunnel } from "~/core/cloudflare/tunnel";
import { provisionReverseProxy } from "~/core/nginx";
import { setupMiddleware } from "./middlewares/setup";

async function logFailure(message: string, promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(message, error);
  }
}

/** Repairs what the domain needs. The domain is checked again by the page. */
export const retryDomainAction = defineFormAction({
  middlewares: [setupMiddleware],
  schema: z.object({}),
  action: () => async (): Promise<Record<string, string>> => {
    await logFailure("Failed to start the reverse proxy:", provisionReverseProxy());
    await logFailure("Failed to start the Cloudflare tunnel:", provisionTunnel());
    await syncDomains({ verify: true });
    refresh();
    return {};
  },
});
