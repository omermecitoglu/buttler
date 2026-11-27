import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBuildCommits } from "./build";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getService: vi.fn(),
  getInstallationTokenForOwner: vi.fn(),
  compareCommits: vi.fn(),
  getCommit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/core/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getService", () => ({ default: mocks.getService }));
vi.mock("~/core/github/app", () => ({ getInstallationTokenForOwner: mocks.getInstallationTokenForOwner }));
vi.mock("~/core/github/commits", () => ({ compareCommits: mocks.compareCommits, getCommit: mocks.getCommit }));

const head = "f81cda3b9e2c4d5a6f7e8d9c0b1a2f3e4d5c6b7a";
const base = "a237ee0b9e2c4d5a6f7e8d9c0b1a2f3e4d5c6b7a";
const commit = { hash: head, shortHash: "f81cda3", message: "fix", author: null, date: null, url: "" };

describe("getBuildCommits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: 2, role: "member", profile: null });
    mocks.getService.mockResolvedValue({ id: "s1", type: "github", repository: "owner/repo" });
    mocks.getInstallationTokenForOwner.mockResolvedValue("token");
  });

  it("requires a user", async () => {
    mocks.requireUser.mockRejectedValue(new Error("401"));
    await expect(getBuildCommits("s1", head, base)).rejects.toThrow("401");
    expect(mocks.getService).not.toHaveBeenCalled();
  });

  it("compares the build with the previous one", async () => {
    mocks.compareCommits.mockResolvedValue({ commits: [commit], total: 1 });
    const result = await getBuildCommits("s1", head, base);
    expect(mocks.getInstallationTokenForOwner).toHaveBeenCalledWith("owner");
    expect(mocks.compareCommits).toHaveBeenCalledWith("token", "owner", "repo", base, head);
    expect(result).toEqual({ commits: [commit], total: 1 });
  });

  it("lists only the commit of the build without a previous one", async () => {
    mocks.getCommit.mockResolvedValue(commit);
    const result = await getBuildCommits("s1", head, null);
    expect(mocks.getCommit).toHaveBeenCalledWith("token", "owner", "repo", head);
    expect(result).toEqual({ commits: [commit], total: 1 });
  });

  it("rejects values that aren't commit hashes", async () => {
    expect(await getBuildCommits("s1", "../../user", null)).toBeNull();
    expect(await getBuildCommits("s1", head, "main")).toBeNull();
    expect(mocks.getService).not.toHaveBeenCalled();
  });

  it("returns null for services that aren't built from GitHub", async () => {
    mocks.getService.mockResolvedValue({ id: "s1", type: "dockerhub", repository: null });
    expect(await getBuildCommits("s1", head, base)).toBeNull();
  });

  it("returns null when GitHub fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.compareCommits.mockRejectedValue(new Error("Not Found"));
    expect(await getBuildCommits("s1", head, base)).toBeNull();
  });
});
