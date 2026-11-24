import { describe, expect, it, vi } from "vitest";

describe("getSharedState", () => {
  it("should share a value between copies of the module", async () => {
    const first = await import("./shared-state");
    const value = first.getSharedState("test", () => new Set(["a"]));
    vi.resetModules();
    const second = await import("./shared-state");
    expect(second).not.toBe(first);
    expect(second.getSharedState("test", () => new Set())).toBe(value);
  });

  it("should keep the values of different names apart", async () => {
    const { getSharedState } = await import("./shared-state");
    expect(getSharedState("a", () => new Set())).not.toBe(getSharedState("b", () => new Set()));
  });
});
