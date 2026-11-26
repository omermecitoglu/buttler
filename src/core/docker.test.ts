import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeCommandInContainer, getExposedPorts, parseExposedPorts } from "./docker";

const mocks = vi.hoisted(() => ({
  exec: vi.fn(),
  start: vi.fn(),
  inspect: vi.fn(),
  inspectImage: vi.fn(),
}));

vi.mock("dockerode", () => ({
  default: vi.fn(function Docker() {
    return {
      getContainer: () => ({ exec: mocks.exec }),
      getImage: () => ({ inspect: mocks.inspectImage }),
    };
  }),
}));

describe("parseExposedPorts", () => {
  it("should return the TCP ports in order", () => {
    expect(parseExposedPorts({ "8080/tcp": {}, "53/udp": {}, "3000/tcp": {}, "80": {} })).toEqual([80, 3000, 8080]);
  });

  it("should return no ports if the image exposes none", () => {
    expect(parseExposedPorts(null)).toEqual([]);
    expect(parseExposedPorts(undefined)).toEqual([]);
  });
});

describe("getExposedPorts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should read the ports from the image config", async () => {
    mocks.inspectImage.mockResolvedValue({ Config: { ExposedPorts: { "80/tcp": {} } } });
    expect(await getExposedPorts("nginx:latest")).toEqual([80]);
  });

  it("should return no ports if the image is not present", async () => {
    mocks.inspectImage.mockRejectedValue(new Error("no such image"));
    expect(await getExposedPorts("missing:latest")).toEqual([]);
  });
});

describe("executeCommandInContainer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.exec.mockResolvedValue({ start: mocks.start, inspect: mocks.inspect });
  });

  it("should return the output and the exit code", async () => {
    mocks.start.mockResolvedValue(Readable.from([Buffer.from("first\r\n"), Buffer.from("second\r\n")]));
    mocks.inspect.mockResolvedValue({ ExitCode: 1 });
    expect(await executeCommandInContainer("id", ["nginx", "-t"])).toEqual({ exitCode: 1, output: "first\nsecond" });
  });

  it("should fail if the command can't be started", async () => {
    mocks.exec.mockRejectedValue(new Error("no docker"));
    await expect(executeCommandInContainer("id", ["nginx", "-t"])).rejects.toThrow("no docker");
  });
});
