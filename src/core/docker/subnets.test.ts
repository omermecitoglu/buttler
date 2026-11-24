import { describe, expect, it } from "vitest";
import { findFreeSubnet } from "./subnets";

const find = (usedSubnets: string[]) => findFreeSubnet("172.30.0.0/16", 28, usedSubnets);

describe("findFreeSubnet", () => {
  it("should start from the beginning of the pool", () => {
    expect(find([])).toBe("172.30.0.0/28");
  });

  it("should skip the subnets that are used", () => {
    expect(find(["172.30.0.0/28", "172.30.0.16/28"])).toBe("172.30.0.32/28");
  });

  it("should use the gaps again", () => {
    expect(find(["172.30.0.0/28", "172.30.0.32/28"])).toBe("172.30.0.16/28");
  });

  it("should skip larger and smaller subnets", () => {
    expect(find(["172.30.0.0/24", "172.30.1.4/30"])).toBe("172.30.1.16/28");
  });

  it("should accept any address of a used subnet", () => {
    expect(find(["172.30.0.77/24"])).toBe("172.30.1.0/28");
  });

  it("should ignore IPv6 and the subnets outside of the pool", () => {
    expect(find(["fd00::/64", "10.0.0.0/8", "172.31.0.0/16"])).toBe("172.30.0.0/28");
  });

  it.each(["172.30.0.0/16", "172.16.0.0/12", "0.0.0.0/0"])("should find nothing if %s is used", subnet => {
    expect(find([subnet])).toBeNull();
  });

  it("should find the last subnet", () => {
    expect(findFreeSubnet("172.30.0.0/27", 28, ["172.30.0.0/28"])).toBe("172.30.0.16/28");
  });
});
