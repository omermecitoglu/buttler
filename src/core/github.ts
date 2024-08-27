import crypto from "crypto";

export function verifySignature(req: Request, buffer: ArrayBuffer, secret: string) {
  const sha1 = crypto.createHmac("sha1", secret).update(Buffer.from(buffer)).digest("hex");
  return req.headers.get("X-Hub-Signature") === `sha1=${sha1}`;
}
