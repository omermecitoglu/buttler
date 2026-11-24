import { describe, expect, it } from "vitest";
import { getPushedBranch, verifyWebhookSignature } from "./webhooks";

describe("verifyWebhookSignature", () => {
  // The example of GitHub's documentation
  const body = Buffer.from("Hello, World!");
  const secret = "It's a Secret to Everybody";
  const signature = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";

  it("should accept valid signatures", () => {
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("should reject missing, malformed and mismatching signatures", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "sha256=abc", secret)).toBe(false);
    expect(verifyWebhookSignature(body, signature, "another secret")).toBe(false);
    expect(verifyWebhookSignature(Buffer.from("Hello, World?"), signature, secret)).toBe(false);
  });
});

describe("getPushedBranch", () => {
  it("should only return branches", () => {
    expect(getPushedBranch("refs/heads/main")).toBe("main");
    expect(getPushedBranch("refs/heads/feat/webhook")).toBe("feat/webhook");
    expect(getPushedBranch("refs/tags/v1.0.0")).toBeNull();
  });
});
