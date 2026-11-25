import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readSetupCode: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("~/core/reachability", () => ({ getInstanceId: () => "instance" }));
vi.mock("~/core/setup-code", () => ({ readSetupCode: mocks.readSetupCode }));

import { GET } from "./route";

describe("GET /auth/instance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should identify the instance during the setup", async () => {
    mocks.readSetupCode.mockReturnValue("code");
    const response = await GET();
    expect(await response.text()).toBe("instance");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("should not exist after the setup", async () => {
    mocks.readSetupCode.mockReturnValue(null);
    const response = await GET();
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});
