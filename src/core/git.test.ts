import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cloneRepo, deleteRepo, parseRepository } from "./git";

const { execFileMock } = vi.hoisted(() => ({ execFileMock: vi.fn() }));

vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");
  return {
    execFile: Object.assign(vi.fn(), { [promisify.custom]: execFileMock }),
  };
});

describe("parseRepository", () => {
  it("should accept full names and GitHub URLs", () => {
    const expected = { owner: "acme", name: "my.app", cloneUrl: "https://github.com/acme/my.app.git" };
    expect(parseRepository("acme/my.app")).toEqual(expected);
    expect(parseRepository("https://github.com/acme/my.app.git")).toEqual(expected);
  });

  it("should reject anything else", () => {
    expect(() => parseRepository("https://example.com/acme/app")).toThrow("Invalid GitHub repository");
    expect(() => parseRepository("app")).toThrow("Invalid GitHub repository");
  });
});

describe("cloneRepo", () => {
  let home: string;

  beforeEach(async () => {
    home = await fs.mkdtemp(path.join(os.tmpdir(), "buttler-git-"));
    vi.stubEnv("BUTTLER_HOME", home);
    execFileMock.mockReset().mockImplementation((_: string, args: string[]) => {
      if (args.includes("log")) {
        return Promise.resolve({ stdout: "abcdef1234567\0Jane\x002026-01-01T00:00:00Z\0feat: one\n\nbody\n" });
      }
      if (args.includes("ls-files")) {
        return Promise.resolve({ stdout: "Dockerfile\0src/a b.ts\0" });
      }
      return Promise.resolve({ stdout: "" });
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(home, { recursive: true, force: true });
  });

  it("should shallow clone the branch and read the commit", async () => {
    const result = await cloneRepo({ serviceId: "srv", repository: "acme/app", branch: "dev", token: "secret" });
    expect(result).toEqual({
      repoPath: path.join(home, "builds/srv"),
      commit: {
        hash: "abcdef1234567",
        shortHash: "abcdef1",
        author: "Jane",
        timestamp: "2026-01-01T00:00:00Z",
        message: "feat: one\n\nbody",
      },
      files: ["Dockerfile", "src/a b.ts"],
    });
    const [command, args, options] = execFileMock.mock.calls[0];
    expect(command).toBe("git");
    expect(args).toEqual([
      "clone",
      "--depth",
      "1",
      "--single-branch",
      "--branch=dev",
      "--",
      "https://github.com/acme/app.git",
      path.join(home, "builds/srv"),
    ]);
    expect(JSON.stringify(args)).not.toContain("secret");
    expect(options.env.GIT_CONFIG_VALUE_0)
      .toBe(`Authorization: Basic ${Buffer.from("x-access-token:secret").toString("base64")}`);
  });

  it("should not send credentials without a token", async () => {
    await cloneRepo({ serviceId: "srv", repository: "acme/app", branch: "dev" });
    expect(execFileMock.mock.calls[0][2].env).not.toHaveProperty("GIT_CONFIG_VALUE_0");
  });

  it("should delete the working directory", async () => {
    await fs.mkdir(path.join(home, "builds/srv"), { recursive: true });
    await deleteRepo("srv");
    await expect(fs.access(path.join(home, "builds/srv"))).rejects.toThrow();
  });
});
