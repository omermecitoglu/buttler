import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccess } from "./access";

const mockGetUser = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getUser", () => ({
  default: (...args: unknown[]) => mockGetUser(...args),
}));

describe("getAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should deny visitors without a session", async () => {
    expect(await getAccess(undefined)).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("should deny unknown users", async () => {
    mockGetUser.mockResolvedValue(null);
    expect(await getAccess(2)).toBeNull();
  });

  it("should return the role of users with access", async () => {
    mockGetUser.mockResolvedValue({ id: 1, role: "admin" });
    expect(await getAccess(1)).toBe("admin");
    expect(mockGetUser).toHaveBeenCalledWith({}, 1);
  });
});
