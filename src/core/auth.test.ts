import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, requireAdmin, requireNotInstalled, requireUser } from "./auth";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccess: vi.fn(),
  isInstalled: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  unauthorized: () => {
    throw new Error("401");
  },
  forbidden: () => {
    throw new Error("403");
  },
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("./session", () => ({ getSession: mocks.getSession }));
vi.mock("./access", () => ({ getAccess: mocks.getAccess }));
vi.mock("./settings", () => ({ isInstalled: mocks.isInstalled }));

const profile = { login: "octocat", name: null, avatar: "https://avatars.githubusercontent.com/u/1" };

describe("auth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 1, user: profile });
    mocks.getAccess.mockResolvedValue("admin");
  });

  it("should return the current user", async () => {
    const user = { id: 1, role: "admin", profile };
    expect(await getCurrentUser()).toEqual(user);
    expect(await requireUser()).toEqual(user);
    expect(await requireAdmin()).toEqual(user);
    expect(mocks.getAccess).toHaveBeenCalledWith(1);
  });

  it("should reject the requests without a session", async () => {
    mocks.getSession.mockResolvedValue({});
    mocks.getAccess.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
    await expect(requireUser()).rejects.toThrow("401");
    await expect(requireAdmin()).rejects.toThrow("401");
  });

  it("should reject the users without access", async () => {
    mocks.getAccess.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
    await expect(requireUser()).rejects.toThrow("403");
    await expect(requireAdmin()).rejects.toThrow("403");
  });

  it("should reject the users who are not the admin", async () => {
    mocks.getAccess.mockResolvedValue("member");
    await expect(requireUser()).resolves.toMatchObject({ role: "member" });
    await expect(requireAdmin()).rejects.toThrow("403");
  });

  it("should lock out the users who lose their access during a session", async () => {
    await requireUser();
    mocks.getAccess.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("403");
  });

  it("should reject the installation of an installed instance", async () => {
    mocks.isInstalled.mockResolvedValue(false);
    await expect(requireNotInstalled()).resolves.toBeUndefined();
    mocks.isInstalled.mockResolvedValue(true);
    await expect(requireNotInstalled()).rejects.toThrow("403");
  });
});
