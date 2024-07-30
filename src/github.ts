import crypto, { type BinaryLike } from "crypto";
import type { Request, Response } from "express";

const app = {
  secret: "",
};

export function setSecret(secret: string) {
  app.secret = secret;
}

export function verifySignature(req: Request, res: Response, buf: BinaryLike, _encoding: string) {
  const sha1 = crypto.createHmac("sha1", app.secret).update(buf).digest("hex");
  const signature = `sha1=${sha1}`;
  if (req.headers["x-hub-signature"] !== signature) {
    throw new Error("Invalid signature");
  }
}
