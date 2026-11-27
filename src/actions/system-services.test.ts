import { beforeEach, describe, expect, it, vi } from "vitest";
import { setShowSystemServicesAction } from "./system-services";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccess: vi.fn(),
  setShowSystemServices: vi.fn(),
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
vi.mock("~/operations/setShowSystemServices", () => ({ default: mocks.setShowSystemServices }));

function save(show: boolean) {
  const formData = new FormData();
  if (show) formData.set("show", "on");
  return setShowSystemServicesAction({}, formData);
}

describe("setShowSystemServicesAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 1 });
    mocks.getAccess.mockResolvedValue("admin");
  });

  it("should show the system services when the box is checked", async () => {
    await save(true);
    expect(mocks.setShowSystemServices).toHaveBeenCalledWith({}, true);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("should hide the system services when the box is unchecked", async () => {
    await save(false);
    expect(mocks.setShowSystemServices).toHaveBeenCalledWith({}, false);
  });

  it("should be denied to members", async () => {
    mocks.getAccess.mockResolvedValue("member");
    await expect(save(true)).rejects.toThrow("403");
    expect(mocks.setShowSystemServices).not.toHaveBeenCalled();
  });
});
