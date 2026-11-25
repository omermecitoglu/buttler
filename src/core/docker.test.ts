import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeCommandInContainer } from "./docker";

const mocks = vi.hoisted(() => ({
  exec: vi.fn(),
  start: vi.fn(),
  inspect: vi.fn(),
}));

vi.mock("dockerode", () => ({
  default: vi.fn(function Docker() {
    return { getContainer: () => ({ exec: mocks.exec }) };
  }),
}));

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
