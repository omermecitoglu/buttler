import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cloudflareFetch } from "./client";
import { getZones } from "./zones";

const mocks = vi.hoisted(() => ({ getAccessToken: vi.fn() }));
const fetchMock = vi.fn<typeof fetch>();

vi.mock("server-only", () => ({}));
vi.mock("./connection", () => mocks);

function getToken(index: number) {
  return new Headers(fetchMock.mock.calls[index][1]?.headers).get("authorization");
}

describe("Cloudflare client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mocks.getAccessToken.mockReset();
    mocks.getAccessToken.mockImplementation((rejected?: string) => Promise.resolve(rejected ? "new" : "old"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should send the token", async () => {
    fetchMock.mockResolvedValue(Response.json({ result: { id: "a" } }));
    expect(await cloudflareFetch("/zones/a")).toEqual({ result: { id: "a" } });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.cloudflare.com/client/v4/zones/a");
    expect(getToken(0)).toBe("Bearer old");
  });

  it.each([401, 403])("should try again with a new token after a %d", async status => {
    fetchMock.mockResolvedValueOnce(Response.json({}, { status }));
    fetchMock.mockResolvedValueOnce(Response.json({ result: [] }));
    await cloudflareFetch("/zones");
    expect(mocks.getAccessToken).toHaveBeenLastCalledWith("old");
    expect(getToken(1)).toBe("Bearer new");
  });

  it("should only try again once", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({
      errors: [{ code: 10000, message: "Authentication error" }],
    }, { status: 403 })));
    await expect(cloudflareFetch("/zones")).rejects.toMatchObject({ message: "Authentication error (10000)", status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should report responses that are not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 502 }));
    await expect(cloudflareFetch("/zones")).rejects.toThrow("status 502");
  });

  it("should list the zones of all pages", async () => {
    const createPage = (page: number) => Response.json({
      result: [{ id: `${page}`, name: `${page}.example.com`, account: { id: "acc", name: "Account" } }],
      result_info: { page, total_pages: 2 },
    });
    fetchMock.mockResolvedValueOnce(createPage(1)).mockResolvedValueOnce(createPage(2));
    expect(await getZones()).toEqual([
      { id: "1", name: "1.example.com", accountId: "acc", accountName: "Account" },
      { id: "2", name: "2.example.com", accountId: "acc", accountName: "Account" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
