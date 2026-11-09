import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAppJwt, getAuthenticatedCloneUrl, getInstallationAccessToken } from "./app";
import * as client from "./client";

function makeRsaPrivateKey() {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return privateKey;
}

describe("generateAppJwt", () => {
  it("should return a three-part JWT string", () => {
    const jwt = generateAppJwt("123", makeRsaPrivateKey());
    expect(jwt.split(".")).toHaveLength(3);
  });

  it("should encode the correct iss and valid exp/iat in the payload", () => {
    const jwt = generateAppJwt(42, makeRsaPrivateKey());
    const [, payloadB64] = jwt.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    expect(payload.iss).toBe("42");
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
});

describe("getInstallationAccessToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call the correct endpoint and return the token", async () => {
    vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 201,
      headers: new Headers(),
      data: {
        token: "ghs_testtoken123",
        expires_at: "2026-11-08T14:00:00Z",
        permissions: { contents: "read", metadata: "read" },
        repository_selection: "selected",
      },
    });

    const result = await getInstallationAccessToken({
      appId: "5664422",
      privateKey: makeRsaPrivateKey(),
      installationId: "179840753",
    });

    expect(client.githubFetch).toHaveBeenCalledWith(
      "/app/installations/179840753/access_tokens",
      expect.any(String),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.token).toBe("ghs_testtoken123");
    expect(result.expiresAt).toBe("2026-11-08T14:00:00Z");
    expect(result.expires_at).toBe("2026-11-08T14:00:00Z");
    expect(result.permissions).toEqual({ contents: "read", metadata: "read" });
    expect(result.repositorySelection).toBe("selected");
    expect(result.repository_selection).toBe("selected");
  });

  it("should send repository scope in the request body when provided", async () => {
    vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 201,
      headers: new Headers(),
      data: {
        token: "ghs_scoped",
        expires_at: "2026-11-08T14:00:00Z",
        permissions: { contents: "read" },
      },
    });

    await getInstallationAccessToken({
      appId: "1",
      privateKey: makeRsaPrivateKey(),
      installationId: "2",
      repositories: ["my-private-repo"],
    });

    expect(client.githubFetch).toHaveBeenCalledWith(
      "/app/installations/2/access_tokens",
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ repositories: ["my-private-repo"] }),
      }),
    );
  });

  it("should send permissions in the request body when provided", async () => {
    vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 201,
      headers: new Headers(),
      data: {
        token: "ghs_perms",
        expires_at: "2026-11-08T14:00:00Z",
        permissions: { contents: "read" },
      },
    });

    await getInstallationAccessToken({
      appId: "1",
      privateKey: makeRsaPrivateKey(),
      installationId: "2",
      permissions: { contents: "read" },
    });

    expect(client.githubFetch).toHaveBeenCalledWith(
      "/app/installations/2/access_tokens",
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ permissions: { contents: "read" } }),
      }),
    );
  });

  it("should send repository_ids in the request body when provided", async () => {
    vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 201,
      headers: new Headers(),
      data: {
        token: "ghs_ids",
        expires_at: "2026-11-08T14:00:00Z",
        permissions: { contents: "read" },
      },
    });

    await getInstallationAccessToken({
      appId: "1",
      privateKey: makeRsaPrivateKey(),
      installationId: "2",
      repositoryIds: [12345, 67890],
    });

    expect(client.githubFetch).toHaveBeenCalledWith(
      "/app/installations/2/access_tokens",
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ repository_ids: [12345, 67890] }),
      }),
    );
  });

  it("should propagate errors thrown by githubFetch", async () => {
    vi.spyOn(client, "githubFetch").mockRejectedValueOnce(new Error("GitHub authentication failed"));

    await expect(getInstallationAccessToken({
      appId: "1",
      privateKey: makeRsaPrivateKey(),
      installationId: "2",
    })).rejects.toThrow("GitHub authentication failed");
  });
});

describe("getAuthenticatedCloneUrl", () => {
  it("should inject the token into a plain https URL", () => {
    const result = getAuthenticatedCloneUrl(
      "https://github.com/owner/repo.git",
      "ghs_token123",
    );
    expect(result).toBe("https://x-access-token:ghs_token123@github.com/owner/repo.git");
  });

  it("should replace an existing credential in the URL", () => {
    const result = getAuthenticatedCloneUrl(
      "https://old-token@github.com/owner/repo.git",
      "ghs_newtoken",
    );
    expect(result).toBe("https://x-access-token:ghs_newtoken@github.com/owner/repo.git");
  });

  it("should handle URLs without .git suffix", () => {
    const result = getAuthenticatedCloneUrl(
      "https://github.com/owner/repo",
      "ghs_abc",
    );
    expect(result).toBe("https://x-access-token:ghs_abc@github.com/owner/repo");
  });
});
