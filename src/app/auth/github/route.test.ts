import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  redirect: vi.fn(),
  getAccess: vi.fn(),
  claimAdmin: vi.fn(),
  updateUser: vi.fn(),
  hasAdmin: vi.fn(),
  isSetupSession: vi.fn(),
  deleteSetupCode: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("~/core/access", () => ({ getAccess: mocks.getAccess }));
vi.mock("~/core/github/users", () => ({ getUser: mocks.getUser }));
vi.mock("~/core/headers", () => ({ getPublicOrigin: () => "https://buttler.test" }));
vi.mock("~/core/home", () => ({ getHomePath: () => "/services" }));
vi.mock("~/core/session", () => ({ getSession: mocks.getSession }));
vi.mock("~/core/settings", () => ({ getSetting: (key: string) => key }));
vi.mock("~/core/setup", () => ({ isSetupSession: mocks.isSetupSession }));
vi.mock("~/core/setup-code", () => ({ deleteSetupCode: mocks.deleteSetupCode }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/claimAdmin", () => ({ default: mocks.claimAdmin }));
vi.mock("~/operations/hasAdmin", () => ({ default: mocks.hasAdmin }));
vi.mock("~/operations/updateUser", () => ({ default: mocks.updateUser }));

import { GET } from "./route";

const user = {
  id: 1,
  login: "octocat",
  name: null,
  avatar: "https://avatars.githubusercontent.com/u/1?v=4",
  avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
  email: "octocat@example.com",
};

describe("GET /auth/github", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue(user);
    mocks.getAccess.mockResolvedValue("admin");
    mocks.hasAdmin.mockResolvedValue(true);
    mocks.isSetupSession.mockResolvedValue(false);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ access_token: "token" }))));
  });

  it("should remember the GitHub account in the session", async () => {
    const session = { save: vi.fn() };
    mocks.getSession.mockResolvedValue(session);

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

  it("should claim the instance before checking the access", async () => {
    const session = { setupCode: "code", save: vi.fn() };
    mocks.getSession.mockResolvedValue(session);
    mocks.isSetupSession.mockResolvedValue(true);

    await GET(new Request("https://buttler.test/auth/github?code=abc"));

    expect(session).not.toHaveProperty("setupCode");
    expect(mocks.deleteSetupCode).toHaveBeenCalledAfter(mocks.claimAdmin);
    expect(mocks.claimAdmin).toHaveBeenCalledWith({}, { id: 1, login: "octocat", avatar: user.avatar });
    expect(mocks.getAccess).toHaveBeenCalledWith(1);
    expect(mocks.claimAdmin.mock.invocationCallOrder[0]).toBeLessThan(mocks.getAccess.mock.invocationCallOrder[0]);
  });

  it("should not let anyone outside of the setup become the admin", async () => {
    const session = { save: vi.fn(), destroy: vi.fn() };
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue(null);
    mocks.hasAdmin.mockResolvedValue(false);

    await GET(new Request("https://buttler.test/auth/github?code=abc"));

    expect(mocks.claimAdmin).not.toHaveBeenCalled();
    expect(mocks.deleteSetupCode).not.toHaveBeenCalled();
    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=setup_link");
  });

  it("should keep the setup code if GitHub rejects the login", async () => {
    mocks.getSession.mockResolvedValue({ setupCode: "code", save: vi.fn() });
    mocks.isSetupSession.mockResolvedValue(true);
    mocks.getUser.mockRejectedValue(new Error("bad credentials"));

    await GET(new Request("https://buttler.test/auth/github?code=abc"));

    expect(mocks.claimAdmin).not.toHaveBeenCalled();
    expect(mocks.deleteSetupCode).not.toHaveBeenCalled();
  });

  it("should let whitelisted users in", async () => {
    const session = { save: vi.fn() };
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue("member");

    await GET(new Request("https://buttler.test/auth/github?code=abc"));

    expect(session).toMatchObject({ userId: 1 });
    expect(mocks.updateUser).toHaveBeenCalledWith({}, { id: 1, login: "octocat", avatar: user.avatar });
    expect(mocks.redirect).toHaveBeenCalledWith("/services");
  });

  it("should not create a session for users without access", async () => {
    const session = { save: vi.fn(), destroy: vi.fn() };
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue(null);

    await GET(new Request("https://buttler.test/auth/github?code=abc"));

    expect(session).not.toHaveProperty("userId");
    expect(session).not.toHaveProperty("githubToken");
    expect(session.save).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=not_allowed");
  });

  it("should reject the requests without a code", async () => {
    const response = await GET(new Request("https://buttler.test/auth/github"));

    expect(response.status).toBe(400);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});
