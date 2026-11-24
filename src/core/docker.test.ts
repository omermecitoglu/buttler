import { afterEach, describe, expect, it, vi } from "vitest";
import { docker, getContainerLogs } from "./docker";

function mockLogs(output: string) {
  const logs = vi.fn((_options: unknown, callback: (error: Error | null, buffer?: Buffer) => void) => {
    callback(null, Buffer.from(output));
  });
  vi.spyOn(docker, "getContainer").mockReturnValue({ logs } as unknown as ReturnType<typeof docker.getContainer>);
}

describe("getContainerLogs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should strip terminal escape sequences", async () => {
    mockLogs("\u001b[32m\u001b[1m✓\u001b[22m\u001b[39m Ready in 120ms\r\n");
    await expect(getContainerLogs("container-id", 100)).resolves.toBe("✓ Ready in 120ms\r\n");
  });

  it("should keep plain text and brackets as they are", async () => {
    mockLogs("[info] listening on [::]:3000\n");
    await expect(getContainerLogs("container-id", 100)).resolves.toBe("[info] listening on [::]:3000\n");
  });
});
