import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("~/core/github/users", () => ({ getUser: mocks.getUser }));
vi.mock("~/core/headers", () => ({ getPublicOrigin: () => "https://buttler.test" }));
vi.mock("~/core/home", () => ({ getHomePath: () => "/services" }));
vi.mock("~/core/session", () => ({ getSession: mocks.getSession }));
vi.mock("~/core/settings", () => ({ getSetting: (key: string) => key }));

import { GET } from "./route";

describe("GET /auth/github", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ access_token: "token" }))));
  });

  it("should remember the GitHub account in the session", async () => {
    const session = { save: vi.fn() };
    mocks.getSession.mockResolvedValue(session);
    mocks.getUser.mockResolvedValue({
      id: 1,
      login: "octocat",
      name: null,
      avatar: "https://avatars.githubusercontent.com/u/1?v=4",
      avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
      email: "octocat@example.com",
    });

    await GET(new Request("https://buttler.test/auth/github?code=abc"));

    expect(session).toMatchObject({
      userId: 1,
      githubToken: "token",
      user: {
        login: "octocat",
        name: null,
        avatar: "https://avatars.githubusercontent.com/u/1?v=4",
      },
    });
    expect(session.save).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/services");
  });

  it("should reject the requests without a code", async () => {
    const response = await GET(new Request("https://buttler.test/auth/github"));

    expect(response.status).toBe(400);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});
