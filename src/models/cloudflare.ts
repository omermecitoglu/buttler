import z from "zod";

export const CloudflareTokens = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** Timestamp in milliseconds */
  expiresAt: z.number(),
}).describe("Represents the credentials of the connected Cloudflare account");

export type CloudflareTokens = z.infer<typeof CloudflareTokens>;
