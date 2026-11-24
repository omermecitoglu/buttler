import { beforeEach, describe, expect, it, vi } from "vitest";
import { addUserAction, removeUserAction } from "./user";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccess: vi.fn(),
  findUser: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({
  unauthorized: () => {
    throw new Error("401");
  },
  forbidden: () => {
    throw new Error("403");
  },
}));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/core/session", () => ({ getSession: mocks.getSession }));
vi.mock("~/core/access", () => ({ getAccess: mocks.getAccess }));
vi.mock("~/core/settings", () => ({}));
vi.mock("~/core/github/users", () => ({ findUser: mocks.findUser }));
vi.mock("~/operations/createUser", () => ({ default: mocks.createUser }));
vi.mock("~/operations/deleteUser", () => ({ default: mocks.deleteUser }));

const user = { id: 2, login: "octocat", avatar: "https://avatars.githubusercontent.com/u/2" };

function add(login: string) {
  const formData = new FormData();
  formData.set("login", login);
  return addUserAction({}, formData);
}

describe("whitelist actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 1, githubToken: "token" });
    mocks.getAccess.mockResolvedValue("admin");
    mocks.findUser.mockResolvedValue(user);
    mocks.createUser.mockResolvedValue(true);
    mocks.deleteUser.mockResolvedValue(true);
  });

  it.each(["octocat", "@octocat", "  @octocat "])("should add a user by the handle \"%s\"", async login => {
    expect(await add(login)).toEqual({});
    expect(mocks.findUser).toHaveBeenCalledWith("octocat", "token");
    expect(mocks.createUser).toHaveBeenCalledWith({}, user);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("should reject unknown handles", async () => {
    mocks.findUser.mockResolvedValue(null);
    expect(await add("nobody")).toEqual({ "[error]": "unknown_user" });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("should reject duplicates", async () => {
    mocks.createUser.mockResolvedValue(false);
    expect(await add("OctoCat")).toEqual({ "[error]": "already_added" });
  });

  it("should report when GitHub is not available", async () => {
    mocks.findUser.mockRejectedValue(new Error("rate limit"));
    expect(await add("octocat")).toEqual({ "[error]": "github_unreachable" });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("should remove a user", async () => {
    expect(await removeUserAction(2, {}, new FormData())).toEqual({});
    expect(mocks.deleteUser).toHaveBeenCalledWith({}, 2);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("should report the users that can't be removed", async () => {
    mocks.deleteUser.mockResolvedValue(false);
    expect(await removeUserAction(1, {}, new FormData())).toEqual({ "[error]": "remove_failed" });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("should reject the users who are not the admin", async () => {
    mocks.getAccess.mockResolvedValue("member");
    await expect(add("octocat")).rejects.toThrow("403");
    await expect(removeUserAction(2, {}, new FormData())).rejects.toThrow("403");
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
