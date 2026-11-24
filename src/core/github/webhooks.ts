import crypto from "node:crypto";
import z from "zod";

export const PushEvent = z.object({
  ref: z.string(),
  deleted: z.boolean().default(false),
  repository: z.object({
    full_name: z.string(),
  }),
  head_commit: z.object({
    id: z.string(),
  }).nullish(),
});

export function verifyWebhookSignature(body: Buffer, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = Buffer.from(`sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`);
  const received = Buffer.from(signature);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

/** Returns the name of the pushed branch, or null if the ref is not a branch (e.g. a tag) */
export function getPushedBranch(ref: string) {
  const prefix = "refs/heads/";
  return ref.startsWith(prefix) ? ref.slice(prefix.length) : null;
}
