import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "./session";

const mocks = vi.hoisted(() => ({
  getIronSession: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("iron-session", () => ({ getIronSession: mocks.getIronSession }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: mocks.headers }));
vi.mock("./settings", () => ({ getSetting: () => "password", setSetting: vi.fn() }));

async function isSecure(origin: string) {
  const url = new URL(origin);
  mocks.headers.mockResolvedValue(new Headers({
    "x-forwarded-proto": url.protocol.slice(0, -1),
    "x-forwarded-host": url.host,
  }));
  await getSession();
  const { cookieOptions } = mocks.getIronSession.mock.lastCall?.[1] as { cookieOptions: { secure: boolean } };
  return cookieOptions.secure;
}

describe("getSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    "https://buttler.example.com",
    "http://buttler.example.com",
    "http://localhost.example.com",
    "http://192.168.1.2:7777",
  ])("should use a secure cookie at %s", async origin => {
    expect(await isSecure(origin)).toBe(true);
  });

  it.each(["http://localhost:7777", "http://127.0.0.1:7777", "http://[::1]:7777"])("should not use a secure cookie at %s", async origin => {
    expect(await isSecure(origin)).toBe(false);
  });

  it("should use a secure cookie if the address is not known", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    await getSession();
    expect(mocks.getIronSession.mock.lastCall?.[1]).toMatchObject({ cookieOptions: { secure: true } });
  });
});
