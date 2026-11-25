import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccess: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unauthorized: () => {
    throw new Error("401");
  },
  forbidden: () => {
    throw new Error("403");
  },
}));
vi.mock("next/server", () => ({ after: vi.fn(), connection: vi.fn() }));
vi.mock("~/i18n/navigation", () => ({ redirect: vi.fn() }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/core/session", () => ({ getSession: mocks.getSession }));
vi.mock("~/core/access", () => ({ getAccess: mocks.getAccess }));

/** They must work without a user */
const publicActions = ["session.ts: logout", "install.ts: installApp"];

/** They have their own checks instead of a session, which are covered by their own tests */
const routesWithOwnCheck = [
  "auth/cloudflare/route.ts",
  "auth/github-install/route.ts",
  "auth/github/route.ts",
  "auth/setup/route.ts",
  "webhooks/github/route.ts",
];

type EntryPoint = (...args: unknown[]) => Promise<unknown>;

const root = path.resolve(import.meta.dirname, "..");

function findFiles(folder: string, pattern: RegExp) {
  return fs.readdirSync(path.join(root, folder), { recursive: true, encoding: "utf-8" })
    .filter(file => pattern.test(file))
    .map(file => ({ name: file, file: path.join(root, folder, file) }));
}

async function findEntryPoints(folder: string, pattern: RegExp) {
  const entries = await Promise.all(findFiles(folder, pattern).map(async ({ name, file }) => {
    const exports = await import(file) as Record<string, unknown>;
    return Object.entries(exports)
      .filter(([, value]) => typeof value === "function")
      .map(([key, value]) => ({ name: `${name}: ${key}`, call: value as EntryPoint }));
  }));
  return entries.flat();
}

// The middlewares are not actions
const actions = await findEntryPoints("actions", /^(?!middlewares[/\\]).*(?<!\.test)\.ts$/);
const routes = await findEntryPoints("app/api", /(^|[/\\])route\.ts$/);
const pages = findFiles("app/[locale]/(base)", /(^|[/\\])page\.tsx$/);

// New entry points are found by their location, so they can't be left open by accident
describe("authorization of the entry points", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should find the entry points", () => {
    expect(actions.length).toBeGreaterThan(publicActions.length);
    expect(routes.length).toBeGreaterThan(0);
    expect(pages.length).toBeGreaterThan(0);
    expect(actions.map(({ name }) => name)).toEqual(expect.arrayContaining(publicActions));
  });

  it("should not find other route handlers outside of /api", () => {
    const names = findFiles("app", /(^|[/\\])route\.ts$/).map(({ name }) => name.replaceAll("\\", "/"));
    expect(names.filter(name => !name.startsWith("api/")).sort()).toEqual(routesWithOwnCheck);
  });

  const protectedEntryPoints = [...actions.filter(({ name }) => !publicActions.includes(name)), ...routes];

  it.each(protectedEntryPoints)("$name should reject the requests without a session", async ({ call }) => {
    mocks.getSession.mockResolvedValue({});
    mocks.getAccess.mockResolvedValue(null);
    await expect(call({}, {})).rejects.toThrow("401");
  });

  it.each(protectedEntryPoints)("$name should reject the users without access", async ({ call }) => {
    mocks.getSession.mockResolvedValue({ userId: 2 });
    mocks.getAccess.mockResolvedValue(null);
    await expect(call({}, {})).rejects.toThrow("403");
  });

  it.each(pages)("$name should be wrapped in Authorized", ({ file }) => {
    expect(fs.readFileSync(file, "utf-8")).toMatch(/<Authorized[ >]/);
  });
});
