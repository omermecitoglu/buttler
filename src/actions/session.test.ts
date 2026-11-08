import { beforeEach, describe, expect, it, vi } from "vitest";
import { logout } from "./session";

const mockDestroy = vi.fn();
const mockGetSession = vi.fn();
const mockRedirect = vi.fn();

vi.mock("~/core/session", () => ({
  getSession: () => mockGetSession(),
}));

vi.mock("~/i18n/navigation", () => ({
  redirect: (args: unknown) => mockRedirect(args),
}));

describe("logout action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      destroy: mockDestroy,
    });
  });

  it("should destroy the session and redirect to /login with locale", async () => {
    await logout("en");

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith({
      locale: "en",
      href: "/login",
    });
  });
});
