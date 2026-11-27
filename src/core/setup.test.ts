import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSetupSession, prepareSetup } from "./setup";

const mocks = vi.hoisted(() => ({
  hasAdmin: vi.fn(),
  getSession: vi.fn(),
  deleteSetupCode: vi.fn(),
  ensureSetupCode: vi.fn(),
  isSetupCode: vi.fn(),
  isInstalled: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/hasAdmin", () => ({ default: mocks.hasAdmin }));
vi.mock("./session", () => ({ getSession: mocks.getSession }));
vi.mock("./settings", () => ({ isInstalled: mocks.isInstalled }));
vi.mock("./setup-code", () => ({
  deleteSetupCode: mocks.deleteSetupCode,
  ensureSetupCode: mocks.ensureSetupCode,
  isSetupCode: mocks.isSetupCode,
}));

describe("setup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should need a code until there is an admin", async () => {
    mocks.hasAdmin.mockResolvedValue(false);
    expect(await prepareSetup()).toBe(true);
    expect(mocks.ensureSetupCode).toHaveBeenCalledTimes(1);
  });

  it("should not leave a code behind", async () => {
    mocks.hasAdmin.mockResolvedValue(true);
    mocks.isInstalled.mockResolvedValue(true);
    expect(await prepareSetup()).toBe(false);
    expect(mocks.deleteSetupCode).toHaveBeenCalledTimes(1);
    expect(mocks.ensureSetupCode).not.toHaveBeenCalled();
  });

  it("should need a code to set up the GitHub App again, even with an admin", async () => {
    mocks.hasAdmin.mockResolvedValue(true);
    mocks.isInstalled.mockResolvedValue(false);
    expect(await prepareSetup()).toBe(true);
    expect(mocks.ensureSetupCode).toHaveBeenCalledTimes(1);
    expect(mocks.deleteSetupCode).not.toHaveBeenCalled();
  });

  it.each([true, false])("should compare the code of the session (%s)", async isRight => {
    mocks.getSession.mockResolvedValue({ setupCode: "code" });
    mocks.isSetupCode.mockReturnValue(isRight);
    expect(await isSetupSession()).toBe(isRight);
    expect(mocks.isSetupCode).toHaveBeenCalledWith("code");
  });
});
