import { describe, expect, it } from "vitest";
import { getContainerState } from "./containerState";

describe("getContainerState", () => {
  it("only lets a running container be recreated", () => {
    expect(getContainerState("running")).toBe("running");
    expect(getContainerState("building")).toBe("busy");
    expect(getContainerState("pulling")).toBe("busy");
    expect(getContainerState("stopped")).toBe("stopped");
    expect(getContainerState("exited")).toBe("stopped");
    expect(getContainerState("restarting")).toBe("stopped");
  });
});
