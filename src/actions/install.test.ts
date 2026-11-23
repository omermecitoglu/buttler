import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubAuthError } from "~/core/github/errors";
import { installApp } from "./install";

const mockSetSetting = vi.fn();
const mockGetGitHubApp = vi.fn();
const mockRedirect = vi.fn();

vi.mock("~/core/settings", () => ({
  setSetting: (key: string, value: string) => mockSetSetting(key, value),
}));

vi.mock("~/core/github/app", () => ({
  getGitHubApp: (appId: string, privateKey: string) => mockGetGitHubApp(appId, privateKey),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

const { privateKey: validPem } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

function makeFormData(fields: Record<string, string | File>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

const validFields = {
  appId: "123",
  privateKey: validPem,
  clientSecret: "secret",
};

describe("installApp action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGitHubApp.mockResolvedValue({
      id: 123,
      slug: "my-buttler",
      clientId: "Iv1.abc",
      htmlUrl: "https://github.com/apps/my-buttler",
    });
  });

  it("should reject a non-numeric app id", async () => {
    const result = await installApp({}, makeFormData({ ...validFields, appId: "abc" }));
    expect(result).toEqual({ error: "invalidAppId" });
    expect(mockSetSetting).not.toHaveBeenCalled();
  });

  it("should reject a missing private key", async () => {
    const result = await installApp({}, makeFormData({ ...validFields, privateKey: "" }));
    expect(result).toEqual({ error: "missingPrivateKey" });
  });

  it("should reject a malformed private key", async () => {
    const result = await installApp({}, makeFormData({ ...validFields, privateKey: "not a pem" }));
    expect(result).toEqual({ error: "invalidPrivateKey" });
  });

  it("should reject a missing client secret", async () => {
    const result = await installApp({}, makeFormData({ ...validFields, clientSecret: "" }));
    expect(result).toEqual({ error: "missingClientSecret" });
  });

  it("should report invalid credentials when GitHub rejects the JWT", async () => {
    mockGetGitHubApp.mockRejectedValueOnce(new GitHubAuthError("Bad credentials"));
    const result = await installApp({}, makeFormData(validFields));
    expect(result).toEqual({ error: "invalidCredentials" });
    expect(mockSetSetting).not.toHaveBeenCalled();
  });

  it("should report GitHub as unreachable on other errors", async () => {
    mockGetGitHubApp.mockRejectedValueOnce(new Error("network down"));
    const result = await installApp({}, makeFormData(validFields));
    expect(result).toEqual({ error: "githubUnreachable" });
  });

  it("should save credentials and fetched metadata, then redirect", async () => {
    await installApp({}, makeFormData({ ...validFields, webhookSecret: "whsec" }));

    expect(mockGetGitHubApp).toHaveBeenCalledWith("123", validPem.trim());
    expect(mockSetSetting).toHaveBeenCalledWith("github_app_id", "123");
    expect(mockSetSetting).toHaveBeenCalledWith("github_private_key", validPem.trim());
    expect(mockSetSetting).toHaveBeenCalledWith("github_client_id", "Iv1.abc");
    expect(mockSetSetting).toHaveBeenCalledWith("github_client_secret", "secret");
    expect(mockSetSetting).toHaveBeenCalledWith("github_app_slug", "my-buttler");
    expect(mockSetSetting).toHaveBeenCalledWith("github_webhook_secret", "whsec");
    expect(mockSetSetting).toHaveBeenLastCalledWith("installed", "true");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("should skip the webhook secret when it is not provided", async () => {
    await installApp({}, makeFormData(validFields));
    expect(mockSetSetting).not.toHaveBeenCalledWith("github_webhook_secret", expect.anything());
  });

  it("should prefer an uploaded PEM file over the textarea", async () => {
    const file = new File([validPem], "key.pem", { type: "application/x-pem-file" });
    await installApp({}, makeFormData({ ...validFields, privateKey: "ignored", privateKeyFile: file }));
    expect(mockGetGitHubApp).toHaveBeenCalledWith("123", validPem.trim());
  });
});
