import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  isSetupCode: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("~/core/session", () => ({ getSession: mocks.getSession }));
vi.mock("~/core/setup-code", () => ({ isSetupCode: mocks.isSetupCode }));

import { GET } from "./route";

const session: { setupCode?: string, save: () => void } = { save: vi.fn() };

function open(query: string) {
  return GET(new Request(`http://localhost:7777/auth/setup${query}`));
}

describe("GET /auth/setup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete session.setupCode;
    mocks.getSession.mockResolvedValue(session);
    mocks.isSetupCode.mockImplementation((code: string) => code === "right");
  });

  it("should remember the code in the session", async () => {
    await expect(open("?code=right")).rejects.toThrow("redirect /install");
    expect(session.setupCode).toBe("right");
    expect(session.save).toHaveBeenCalledTimes(1);
  });

  it.each(["", "?code=", "?code=wrong"])("should not accept \"%s\"", async query => {
    await expect(open(query)).rejects.toThrow("redirect /install");
    expect(session.setupCode).toBeUndefined();
    expect(session.save).not.toHaveBeenCalled();
  });
});
