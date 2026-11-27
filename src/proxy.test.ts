import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isInstalled: vi.fn(),
  getAccess: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response("page") }));
vi.mock("./core/access", () => ({ getAccess: mocks.getAccess }));
vi.mock("./core/headers", () => ({ getPublicOrigin: () => Promise.resolve("https://buttler.test") }));
vi.mock("./core/home", () => ({ getHomePath: () => "/services" }));
vi.mock("./core/session", () => ({ getSession: () => Promise.resolve({ userId: 1 }) }));
vi.mock("./core/settings", () => ({ isInstalled: mocks.isInstalled }));

const { proxy } = await import("./proxy");

async function visit(pathname: string) {
  const { NextRequest } = await import("next/server");
  const response = await proxy(new NextRequest(`https://buttler.test${pathname}`));
  return response.headers.get("location") ?? await response.text();
}

describe("proxy", () => {
  beforeEach(() => {
    mocks.isInstalled.mockResolvedValue(true);
    mocks.getAccess.mockResolvedValue("member");
  });

  it.each([
    ["/install", "page"],
    ["/en/install", "page"],
    ["/services", "https://buttler.test/install"],
    ["/en/login", "https://buttler.test/en/install"],
  ])("only opens the setup before the installation: %s", async (pathname, result) => {
    mocks.isInstalled.mockResolvedValue(false);
    expect(await visit(pathname)).toBe(result);
  });

  it.each([
    ["/services", "page"],
    ["/en/settings", "page"],
    ["/login", "https://buttler.test/services"],
    ["/en/login?error=github", "https://buttler.test/en/services"],
    ["/install", "https://buttler.test/services"],
  ])("lets users with access in: %s", async (pathname, result) => {
    expect(await visit(pathname)).toBe(result);
  });

  it.each([
    ["/services", "https://buttler.test/login"],
    ["/en/services/abc?tab=logs", "https://buttler.test/en/login"],
    ["/", "https://buttler.test/login"],
    ["/login", "page"],
    ["/login?error=not_allowed", "page"],
    ["/install", "https://buttler.test/services"],
  ])("sends everyone else to the login: %s", async (pathname, result) => {
    mocks.getAccess.mockResolvedValue(null);
    expect(await visit(pathname)).toBe(result);
  });
});
