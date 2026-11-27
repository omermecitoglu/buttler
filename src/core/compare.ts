import crypto from "node:crypto";

/** Compares secrets in constant time, so the time of the answer doesn't tell how much of a guess was right */
export function isSameSecret(a: string, b: string) {
  const [
    first,
    second,
  ] = [Buffer.from(a), Buffer.from(b)];
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}
