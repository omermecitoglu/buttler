import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isInstalled: vi.fn(),
  isSetupSession: vi.fn(),
  setSetting: vi.fn(),
  redirect: vi.fn(),
  getDashboardDomain: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  forbidden: () => {
    throw new Error("403");
  },
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("~/core/access", () => ({}));
vi.mock("~/core/session", () => ({}));
vi.mock("~/core/setup", () => ({ isSetupSession: mocks.isSetupSession }));
vi.mock("~/core/settings", () => ({ isInstalled: mocks.isInstalled, setSetting: mocks.setSetting }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getDashboardDomain", () => ({ default: mocks.getDashboardDomain }));

import { GET } from "./route";

const fetchMock = vi.fn();

function install(query = "?code=abc") {
  return GET(new Request(`https://buttler.test/auth/github-install${query}`));
}

describe("GET /auth/github-install", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    mocks.isInstalled.mockResolvedValue(false);
    mocks.isSetupSession.mockResolvedValue(true);
    mocks.getDashboardDomain.mockResolvedValue("buttler.example.com");
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    fetchMock.mockResolvedValue(Response.json({
      id: 123,
      client_id: "Iv1.abc",
      client_secret: "secret",
      slug: "my-buttler",
      pem: "pem",
      webhook_secret: "whsec",
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should not replace the GitHub App of an installed instance", async () => {
    mocks.isInstalled.mockResolvedValue(true);
    await expect(install()).rejects.toThrow("403");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.setSetting).not.toHaveBeenCalled();
  });

  it("should not install without the setup link", async () => {
    mocks.isSetupSession.mockResolvedValue(false);
    await expect(install()).rejects.toThrow("403");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.setSetting).not.toHaveBeenCalled();
  });

  it("should not install before the domain is chosen", async () => {
    mocks.getDashboardDomain.mockResolvedValue(null);
    await expect(install()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/install");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.setSetting).not.toHaveBeenCalled();
  });

  it("should save the credentials and lead to the login", async () => {
    await expect(install()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.setSetting.mock.calls).toEqual([
      ["github_app_id", "123"],
      ["github_client_id", "Iv1.abc"],
      ["github_client_secret", "secret"],
      ["github_app_slug", "my-buttler"],
      ["github_private_key", "pem"],
      ["github_webhook_secret", "whsec"],
      ["github_app_domain", "buttler.example.com"],
      ["installed", "true"],
    ]);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/login");
  });

  it("should not install without a code", async () => {
    await expect(install("")).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/install?error=missing_code");
    expect(mocks.setSetting).not.toHaveBeenCalled();
  });

  it("should not install when GitHub rejects the code", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(install()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/install?error=manifest_conversion_failed");
    expect(mocks.setSetting).not.toHaveBeenCalled();
  });
});
