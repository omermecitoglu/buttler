import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminMiddleware } from "./admin";
import { setupMiddleware } from "./setup";
import { userMiddleware } from "./user";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requireSetupOrAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/core/auth", () => mocks);

describe.each([
  { name: "userMiddleware", middleware: userMiddleware, check: mocks.requireUser },
  { name: "adminMiddleware", middleware: adminMiddleware, check: mocks.requireAdmin },
  { name: "setupMiddleware", middleware: setupMiddleware, check: mocks.requireSetupOrAdmin },
])("$name", ({ middleware, check }) => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should let the allowed users through", async () => {
    check.mockResolvedValue({ id: 1, role: "admin", profile: null });
    await expect(middleware()).resolves.toBeUndefined();
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("should reject everyone else", async () => {
    check.mockRejectedValue(new Error("403"));
    await expect(middleware()).rejects.toThrow("403");
  });
});
