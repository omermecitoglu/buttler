import { afterEach, describe, expect, it, vi } from "vitest";
import { requireUser } from "~/core/auth";
import getServiceRecipe from "~/operations/getServiceRecipe";
import { GET } from "./route";

vi.mock("~/core/auth", () => ({ requireUser: vi.fn() }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getServiceRecipe", () => ({ default: vi.fn() }));

describe("GET /api/services/export", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should download the recipe of the chosen services", async () => {
    const recipe = { version: 1 as const, services: [], links: [] };
    vi.mocked(getServiceRecipe).mockResolvedValue(recipe);

    const response = await GET(new Request("http://localhost/api/services/export?id=a&id=b"));

    expect(requireUser).toHaveBeenCalled();
    expect(getServiceRecipe).toHaveBeenCalledWith({}, ["a", "b"]);
    expect(response.headers.get("content-disposition")).toBe("attachment; filename=\"buttler-services.json\"");
    expect(await response.json()).toEqual(recipe);
  });

  it("should not download anything without access", async () => {
    vi.mocked(requireUser).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(GET(new Request("http://localhost/api/services/export?id=a"))).rejects.toThrow();
    expect(getServiceRecipe).not.toHaveBeenCalled();
  });
});
