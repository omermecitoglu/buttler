import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAndDeploy, findLatestImage, getBuildLogPath, getImageRepository, startBuilding, startGitHubService } from "./build";
import { isServiceBuilding } from "./docker/status";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  buildImage: vi.fn(),
  listImages: vi.fn(),
  createContainer: vi.fn(),
  cloneRepo: vi.fn(),
  deleteRepo: vi.fn(),
  getToken: vi.fn(),
  container: { start: vi.fn(), stop: vi.fn(), remove: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("~/core/docker", () => ({
  buildImage: mocks.buildImage,
  docker: {
    listImages: mocks.listImages,
    listContainers: () => Promise.resolve([{ Id: "old", Names: [], Labels: { "buttler.service-id": "srv" } }]),
    getContainer: () => mocks.container,
    createContainer: mocks.createContainer,
    createVolume: vi.fn(),
  },
}));
vi.mock("~/core/git", () => ({
  parseRepository: () => ({ owner: "acme" }),
  cloneRepo: mocks.cloneRepo,
  deleteRepo: mocks.deleteRepo,
}));
vi.mock("~/core/github/app", () => ({ getInstallationTokenForOwner: mocks.getToken }));

const service = {
  id: "srv",
  name: "My App!",
  type: "github",
  repository: "acme/app",
  branch: "dev",
  ports: [{ external: 8080, internal: 80 }],
  environmentVariables: [
    { key: "RUNTIME_ONLY", value: "r1", scope: "runtime" as const, isSecret: false },
    { key: "RUNTIME_SECRET", value: "r2", scope: "runtime" as const, isSecret: true },
    { key: "NEXT_PUBLIC_URL", value: "b1", scope: "both" as const, isSecret: false },
    { key: "NPM_TOKEN", value: "hunter22", scope: "build" as const, isSecret: true },
  ],
  volumes: [{ name: "data", containerPath: "/data" }],
};

describe("build pipeline", () => {
  let home: string;

  beforeEach(async () => {
    home = await fs.mkdtemp(path.join(os.tmpdir(), "buttler-build-"));
    vi.stubEnv("BUTTLER_HOME", home);
    vi.clearAllMocks();
    mocks.getToken.mockResolvedValue("token");
    mocks.cloneRepo.mockResolvedValue({
      repoPath: "/repo",
      files: ["Dockerfile"],
      commit: { hash: "abcdef123", shortHash: "abcdef1", author: "Jane", timestamp: "now", message: "feat" },
    });
    mocks.deleteRepo.mockResolvedValue(undefined);
    mocks.buildImage.mockResolvedValue("sha256:new");
    mocks.createContainer.mockResolvedValue(mocks.container);
    mocks.listImages.mockResolvedValue([]);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(home, { recursive: true, force: true });
  });

  it("should create valid image names", () => {
    expect(getImageRepository(service)).toBe("buttler/my-app");
    expect(getImageRepository({ id: "srv", name: "***" })).toBe("buttler/srv");
  });

  it("should clone, build, deploy and clean up", async () => {
    const build = buildAndDeploy(service);
    expect(isServiceBuilding("srv")).toBe(true);
    await build;
    expect(isServiceBuilding("srv")).toBe(false);
    expect(mocks.getToken).toHaveBeenCalledWith("acme");
    expect(mocks.cloneRepo).toHaveBeenCalledWith({
      serviceId: "srv", repository: "acme/app", branch: "dev", token: "token",
    });
    const options = mocks.buildImage.mock.calls[0][0];
    expect(options).toMatchObject({
      contextPath: "/repo",
      repository: "buttler/my-app",
      tag: "abcdef1",
      labels: { "buttler.service-id": "srv", "buttler.branch": "dev", "buttler.commit": "abcdef123" },
    });
    expect(options.labels["buttler.built-at"]).toMatch(/^\d{4}-.*Z$/);
    // only the variables that are scoped for the build are sent, and secrets are not build args
    expect(options.buildArgs).toEqual({ NEXT_PUBLIC_URL: "b1" });
    expect(options.secrets).toEqual({ NPM_TOKEN: "hunter22" });
    expect(mocks.container.stop).toHaveBeenCalled();
    expect(mocks.createContainer).toHaveBeenCalledWith(expect.objectContaining({
      Image: "sha256:new",
      Env: ["RUNTIME_ONLY=r1", "RUNTIME_SECRET=r2", "NEXT_PUBLIC_URL=b1"],
      Labels: expect.objectContaining({ "buttler.service-id": "srv" }),
      HostConfig: expect.objectContaining({
        Binds: ["data:/data"],
        PortBindings: { "80/tcp": [{ HostPort: "8080" }] },
      }),
    }));
    expect(mocks.container.start).toHaveBeenCalled();
    expect(mocks.deleteRepo).toHaveBeenCalledWith("srv");
    await vi.waitFor(async () => {
      expect(await fs.readFile(getBuildLogPath("srv"), "utf-8")).toContain("Deployed");
    });
  });

  it("should hide build secrets in the log", async () => {
    mocks.buildImage.mockImplementation(options => {
      options.onProgress("token is hun");
      options.onProgress("ter22\nunfinished hunter22");
      return Promise.reject(new Error("failed with hunter22"));
    });
    await expect(buildAndDeploy(service)).rejects.toThrow();
    await vi.waitFor(async () => {
      const log = await fs.readFile(getBuildLogPath("srv"), "utf-8");
      expect(log).toContain("token is ***\nunfinished ***");
      expect(log).toContain("Failed: failed with ***");
      expect(log).not.toContain("hunter22");
    });
  });

  it("should keep the running container and clean up when the build fails", async () => {
    mocks.buildImage.mockRejectedValue(new Error("exit code: 1"));
    await expect(buildAndDeploy(service)).rejects.toThrow("exit code: 1");
    expect(mocks.container.stop).not.toHaveBeenCalled();
    expect(mocks.container.remove).not.toHaveBeenCalled();
    expect(mocks.deleteRepo).toHaveBeenCalledWith("srv");
    expect(isServiceBuilding("srv")).toBe(false);
  });

  it("should reject services without a repository or branch", async () => {
    await expect(buildAndDeploy({ ...service, branch: null })).rejects.toThrow("No repository or branch");
    expect(isServiceBuilding("srv")).toBe(false);
  });

  it("should not overlap builds and should merge queued ones", async () => {
    const first = buildAndDeploy(service);
    const second = buildAndDeploy(service);
    expect(buildAndDeploy(service)).toBe(second);
    await first;
    expect(mocks.buildImage).toHaveBeenCalledTimes(1);
    await second;
    expect(mocks.buildImage).toHaveBeenCalledTimes(2);
  });

  it("should schedule builds after the response", async () => {
    mocks.buildImage.mockRejectedValue(new Error("boom"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    startBuilding(service);
    expect(isServiceBuilding("srv")).toBe(true);
    expect(mocks.cloneRepo).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0][0]();
    expect(consoleError).toHaveBeenCalled();
    expect(isServiceBuilding("srv")).toBe(false);
    consoleError.mockRestore();
  });

  it("should find the latest image by its build date", async () => {
    mocks.listImages.mockResolvedValue([
      { Id: "a", Labels: { "buttler.built-at": "2026-01-01T00:00:00Z" } },
      { Id: "b", Labels: { "buttler.built-at": "2026-02-01T00:00:00Z" } },
    ]);
    expect(await findLatestImage("srv")).toBe("b");
  });

  it("should start from the latest image without building", async () => {
    mocks.listImages.mockResolvedValue([{ Id: "a", Labels: {} }]);
    await startGitHubService(service);
    expect(mocks.buildImage).not.toHaveBeenCalled();
    expect(mocks.createContainer).toHaveBeenCalledWith(expect.objectContaining({ Image: "a" }));
  });

  it("should build when there is no image to start from", async () => {
    await startGitHubService(service);
    expect(mocks.buildImage).toHaveBeenCalledTimes(1);
  });
});
