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
vi.spyOn(console, "error").mockImplementation(() => undefined);
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

function pendingSession(extra: Record<string, unknown> = {}) {
  return {
    githubLogin: { state: "state", expiresAt: Date.now() + 60_000 },
    save: vi.fn(),
    destroy: vi.fn(),
    ...extra,
  };
}

function callback(query = "code=abc&state=state") {
  return GET(new Request(`https://buttler.test/auth/github?${query}`));
}

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
    const session = pendingSession();
    mocks.getSession.mockResolvedValue(session);

    await callback();

    expect(session).toMatchObject({
      userId: 1,
      githubToken: "token",
      user: {
        login: "octocat",
        name: null,
        avatar: "https://avatars.githubusercontent.com/u/1?v=4",
      },
    });
    expect(session).not.toHaveProperty("githubLogin");
    expect(fetch).toHaveBeenCalledWith("https://github.com/login/oauth/access_token", expect.objectContaining({
      body: expect.stringContaining("\"redirect_uri\":\"https://buttler.test/auth/github\""),
    }));
    expect(mocks.redirect).toHaveBeenCalledWith("/services");
  });

  it.each([
    ["without a state", "code=abc"],
    ["with another state", "code=abc&state=other"],
  ])("should reject a callback %s", async (_, query) => {
    const session = pendingSession();
    mocks.getSession.mockResolvedValue(session);

    await callback(query);

    expect(fetch).not.toHaveBeenCalled();
    expect(session).not.toHaveProperty("userId");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=invalid_state");
  });

  it("should reject a callback that this browser didn't start", async () => {
    mocks.getSession.mockResolvedValue({ save: vi.fn() });

    await callback();

    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=invalid_state");
  });

  it("should use a state only once", async () => {
    const session = pendingSession();
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue(null);

    await callback();
    mocks.redirect.mockClear();
    await callback();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=invalid_state");
  });

  it("should reject an expired login", async () => {
    const session = pendingSession({ githubLogin: { state: "state", expiresAt: Date.now() - 1 } });
    mocks.getSession.mockResolvedValue(session);

    await callback();

    expect(session).not.toHaveProperty("githubLogin");
    expect(session.save).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=invalid_state");
  });

  it.each([
    ["access_denied", "access_denied"],
    ["redirect_uri_mismatch", "github"],
  ])("should show the error %s of GitHub", async (error, shown) => {
    mocks.getSession.mockResolvedValue(pendingSession());

    await callback(`error=${error}&state=state`);

    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(`/login?error=${shown}`);
  });

  it("should reject a callback without a code", async () => {
    mocks.getSession.mockResolvedValue(pendingSession());

    await callback("state=state");

    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=missing_code");
  });

  it.each([
    ["an invalid code", () => Promise.resolve(Response.json({ error: "bad_verification_code" }))],
    ["an error of GitHub", () => Promise.resolve(new Response("unavailable", { status: 503 }))],
    ["an unreachable GitHub", () => Promise.reject(new TypeError("fetch failed"))],
  ])("should show an error for %s without a half-created session", async (_, answer) => {
    const session = pendingSession({ setupCode: "code" });
    mocks.getSession.mockResolvedValue(session);
    mocks.isSetupSession.mockResolvedValue(true);
    vi.mocked(fetch).mockImplementation(answer);

    await callback();

    expect(session).not.toHaveProperty("userId");
    expect(session).not.toHaveProperty("githubToken");
    expect(session).toHaveProperty("setupCode", "code");
    expect(mocks.claimAdmin).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=github");
  });

  it("should claim the instance before checking the access", async () => {
    const session = pendingSession({ setupCode: "code" });
    mocks.getSession.mockResolvedValue(session);
    mocks.isSetupSession.mockResolvedValue(true);

    await callback();

    expect(session).not.toHaveProperty("setupCode");
    expect(mocks.deleteSetupCode).toHaveBeenCalledAfter(mocks.claimAdmin);
    expect(mocks.claimAdmin).toHaveBeenCalledWith({}, { id: 1, login: "octocat", avatar: user.avatar });
    expect(mocks.getAccess).toHaveBeenCalledWith(1);
    expect(mocks.claimAdmin.mock.invocationCallOrder[0]).toBeLessThan(mocks.getAccess.mock.invocationCallOrder[0]);
  });

  it("should not let anyone outside of the setup become the admin", async () => {
    const session = pendingSession();
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue(null);
    mocks.hasAdmin.mockResolvedValue(false);

    await callback();

    expect(mocks.claimAdmin).not.toHaveBeenCalled();
    expect(mocks.deleteSetupCode).not.toHaveBeenCalled();
    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=setup_link");
  });

  it("should keep the setup code if GitHub rejects the login", async () => {
    mocks.getSession.mockResolvedValue(pendingSession({ setupCode: "code" }));
    mocks.isSetupSession.mockResolvedValue(true);
    mocks.getUser.mockRejectedValue(new Error("bad credentials"));

    await callback();

    expect(mocks.claimAdmin).not.toHaveBeenCalled();
    expect(mocks.deleteSetupCode).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=github");
  });

  it("should let whitelisted users in", async () => {
    const session = pendingSession();
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue("member");

    await callback();

    expect(session).toMatchObject({ userId: 1 });
    expect(mocks.updateUser).toHaveBeenCalledWith({}, { id: 1, login: "octocat", avatar: user.avatar });
    expect(mocks.redirect).toHaveBeenCalledWith("/services");
  });

  it("should not create a session for users without access", async () => {
    const session = pendingSession();
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue(null);

    await callback();

    expect(session).not.toHaveProperty("userId");
    expect(session).not.toHaveProperty("githubToken");
    // Only to use the state up
    expect(session.save).toHaveBeenCalledTimes(1);
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=not_allowed");
  });
});
