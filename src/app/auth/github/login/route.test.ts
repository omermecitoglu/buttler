import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSetting: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("~/core/headers", () => ({ getPublicOrigin: () => "https://buttler.test" }));
vi.mock("~/core/session", () => ({ getSession: mocks.getSession }));
vi.mock("~/core/settings", () => ({ getSetting: mocks.getSetting }));

import { GET } from "./route";

describe("GET /auth/github/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSetting.mockResolvedValue("client-id");
  });

  it("keeps a new state in the session and sends it to GitHub", async () => {
    const session = { save: vi.fn() };
    mocks.getSession.mockResolvedValue(session);

    await GET(new Request("https://buttler.test/auth/github/login"));

    const { githubLogin } = session as { githubLogin?: { state: string, expiresAt: number } };
    expect(githubLogin?.state).toMatch(/^[\w-]{43}$/);
    expect(githubLogin?.expiresAt).toBeGreaterThan(Date.now());
    expect(session.save).toHaveBeenCalledTimes(1);
    const url = new URL(mocks.redirect.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client-id",
      redirect_uri: "https://buttler.test/auth/github",
      scope: "read:user",
      state: githubLogin?.state,
    });
  });

  it("creates another state for every login", async () => {
    const session = { save: vi.fn() } as { save: () => void, githubLogin?: { state: string } };
    mocks.getSession.mockResolvedValue(session);

    await GET(new Request("https://buttler.test/auth/github/login"));
    const first = session.githubLogin?.state;
    await GET(new Request("https://buttler.test/auth/github/login"));

    expect(session.githubLogin?.state).not.toBe(first);
  });

  it("goes back to the login page without a GitHub App", async () => {
    mocks.getSetting.mockResolvedValue(null);
    mocks.getSession.mockResolvedValue({ save: vi.fn() });

    await GET(new Request("https://buttler.test/auth/github/login"));

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
