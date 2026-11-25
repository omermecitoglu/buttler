import z from "zod";

export const CloudflareTokens = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** Timestamp in milliseconds */
  expiresAt: z.number(),
}).describe("Represents the credentials of the connected Cloudflare account");

export type CloudflareTokens = z.infer<typeof CloudflareTokens>;

export const CloudflareTunnel = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  /** Only missing if the tunnel couldn't be set up completely */
  token: z.string().min(1).nullable(),
}).describe("Represents the tunnel that Buttler has created in the connected Cloudflare account");

export type CloudflareTunnel = z.infer<typeof CloudflareTunnel>;
